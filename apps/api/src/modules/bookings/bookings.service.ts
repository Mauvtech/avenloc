import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, BookingStatus, PaymentStatus, PricingUnit } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { MessagingService } from '@/modules/messaging/messaging.service';
import { PaymentsService } from '@/modules/payments/payments.service';
import { DepositsService } from '@/modules/deposits/deposits.service';
import { PricingService } from './pricing.service';
import type { CreateBookingDto } from './dto/create-booking.dto';
import type { QuoteResponseDto } from './dto/quote.dto';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly messaging: MessagingService,
    private readonly payments: PaymentsService,
    private readonly deposits: DepositsService,
  ) {}

  /** Calcule unitCount selon pricingUnit — utilisé par quote() et create() pour rester cohérents. */
  private computeUnitCount(pricingUnit: PricingUnit, start: Date, end: Date): number {
    const diffMs = end.getTime() - start.getTime();
    switch (pricingUnit) {
      case PricingUnit.NIGHT:
      case PricingUnit.DAY:
        return Math.round(diffMs / (1000 * 60 * 60 * 24));
      case PricingUnit.HOUR:
        // Facturation à l'heure entamée : 1h30 = 2 unités. Le front ne doit proposer
        // que des créneaux sur les bornes horaires (voir ListingAvailabilityRule),
        // donc diffMs est normalement déjà un multiple exact d'une heure.
        return Math.ceil(diffMs / (1000 * 60 * 60));
    }
  }

  /** Devis de prix (aucune réservation créée) — pour l'aperçu côté locataire. */
  async quote(dto: {
    listingId: string;
    startDate: string;
    endDate: string;
  }): Promise<QuoteResponseDto> {
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
    });
    if (!listing) throw new NotFoundException('Annonce introuvable');

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (start >= end) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début');
    }

    const unitCount = this.computeUnitCount(listing.pricingUnit, start, end);
    if (unitCount <= 0) throw new BadRequestException('Durée invalide');

    const p = await this.pricingService.calculate(listing, unitCount);
    return {
      unitCount,
      pricingUnit: listing.pricingUnit,
      basePrice: listing.basePrice.toString(),
      baseAmount: p.baseAmount.toString(),
      cleaningFee: p.cleaningFee.toString(),
      serviceFee: p.serviceFee.toString(),
      taxAmount: p.taxAmount.toString(),
      totalAmount: p.totalAmount.toString(),
      depositAmount: listing.depositAmount?.toString() ?? null,
    };
  }

  async create(dto: CreateBookingDto, currentUser: AuthenticatedUser) {
    const listing = await this.prisma.listing.findUnique({
      where: { id: dto.listingId },
    });
    if (!listing || listing.status !== 'PUBLISHED') {
      throw new NotFoundException('Annonce introuvable ou non publiée');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    // Pour le horaire, la comparaison "dans le passé" doit se faire à la minute près,
    // pas au jour près (sinon on pourrait réserver un créneau à 9h alors qu'il est 14h).
    const now = new Date();
    const pastCutoff = listing.pricingUnit === PricingUnit.HOUR
      ? now
      : (() => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; })();

    if (start < pastCutoff) {
      throw new BadRequestException('Ce créneau est déjà passé');
    }
    if (start >= end) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début');
    }

    if (listing.maxGuests !== null && dto.guestCount > listing.maxGuests) {
      throw new BadRequestException(
        `Ce logement accepte au maximum ${listing.maxGuests} personnes`,
      );
    }

    // Activité/usage déclaré obligatoire dès que la validation hôte est requise —
    // c'est sur cette base que l'hôte accepte ou refuse la demande.
    if (!listing.instantBookEnabled && !dto.activityDescription?.trim()) {
      throw new BadRequestException(
        "Merci de décrire l'activité et l'usage prévus de l'espace",
      );
    }

    // RC Pro : confirmation bloquante si l'annonce l'exige.
    if (listing.rcProRequired && !dto.rcProConfirmed) {
      throw new BadRequestException(
        "Une confirmation d'assurance RC Pro est requise pour réserver cet espace",
      );
    }

    // Règlement intérieur : acceptation bloquante dès qu'un règlement est renseigné.
    if (listing.houseRules && !dto.houseRulesAccepted) {
      throw new BadRequestException(
        "Merci d'accepter le règlement intérieur de l'espace",
      );
    }

    const unitCount = this.computeUnitCount(listing.pricingUnit, start, end);

    if (unitCount <= 0) {
      throw new BadRequestException('Durée de réservation invalide');
    }

    const pricing = await this.pricingService.calculate(listing, unitCount);
    const windowHours = await this.pricingService.getHostApprovalWindowHours();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let booking: any;
    try {
      booking = await this.prisma.$transaction(async (tx) => {
        // Advisory lock on listing to serialize concurrent booking attempts.
        // `pg_advisory_xact_lock` renvoie `void` : on l'appelle en position FROM
        // et on sélectionne une constante, sinon Prisma échoue à désérialiser `void`.
        await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${listing.id}))`;

        // Check availability within transaction
        const overlap = await tx.booking.findFirst({
          where: {
            listingId: listing.id,
            status: { in: ['PENDING', 'CONFIRMED'] },
            AND: [
              { startDate: { lt: end } },
              { endDate: { gt: start } },
            ],
          },
        });

        if (overlap) {
          throw new ConflictException('Ce créneau n\'est plus disponible');
        }

        // Jours/créneaux bloqués par l'hôte (calendrier de disponibilité)
        const blocked = await tx.listingAvailability.findFirst({
          where: {
            listingId: listing.id,
            isAvailable: false,
            AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
          },
        });
        if (blocked) {
          throw new ConflictException(
            "L'hôte a rendu ce créneau indisponible",
          );
        }

        const hostApprovalDeadline = listing.instantBookEnabled
          ? null
          : new Date(Date.now() + windowHours * 3600 * 1000);

        // Toujours PENDING à la création, y compris en instant book : le
        // paiement (createPaymentIntent → capture automatique) est ce qui fait
        // passer la réservation à CONFIRMED, jamais la simple création — sinon
        // le locataire obtient une réservation confirmée sans jamais payer.
        return tx.booking.create({
          data: {
            listingId: listing.id,
            tenantId: currentUser.id,
            status: BookingStatus.PENDING,
            startDate: start,
            endDate: end,
            unitCount,
            guestCount: dto.guestCount,
            guestNote: dto.guestNote,
            arrivalTime: dto.arrivalTime,
            activityDescription: dto.activityDescription,
            rcProConfirmed: dto.rcProConfirmed ?? false,
            houseRulesAccepted: dto.houseRulesAccepted ?? false,
            baseAmount: pricing.baseAmount,
            cleaningFee: pricing.cleaningFee,
            serviceFee: pricing.serviceFee,
            taxAmount: pricing.taxAmount,
            totalAmount: pricing.totalAmount,
            hostApprovalDeadline,
          },
        });
      });
    } catch (err) {
      // PostgreSQL exclusion_violation (23P01) or unique violation from EXCLUDE constraint
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        (err.code === 'P2002' || err.code === 'P2034')
      ) {
        throw new ConflictException('Ce créneau n\'est plus disponible');
      }
      throw err;
    }

    // La messagerie s'ouvre uniquement une fois le paiement effectif (voir
    // PaymentsService.createPaymentIntent / capturePaymentIntent), jamais à la
    // simple création — même pour une réservation instant book déjà CONFIRMED
    // ici : aucun paiement n'a encore été capturé à ce stade.

    return booking;
  }

  async findAll(currentUser: AuthenticatedUser, role: 'tenant' | 'host') {
    if (role === 'tenant') {
      return this.prisma.booking.findMany({
        where: { tenantId: currentUser.id },
        include: {
          listing: { select: { title: true, city: true, type: true, addressLine1: true, postalCode: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.booking.findMany({
      where: { listing: { hostId: currentUser.id } },
      include: {
        listing: { select: { title: true, city: true, type: true, pricingUnit: true } },
        tenant: { select: { firstName: true, lastName: true, avatarUrl: true } },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, currentUser: AuthenticatedUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        listing: { include: { photos: { orderBy: { position: 'asc' }, take: 1 } } },
        tenant: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        payment: true,
      },
    });

    if (!booking) throw new NotFoundException('Réservation introuvable');

    const isHost = booking.listing.hostId === currentUser.id;
    const isTenant = booking.tenantId === currentUser.id;
    if (!isHost && !isTenant) throw new ForbiddenException();

    return booking;
  }

  /**
   * Approbation hôte d'une demande en attente. Trois cas selon l'état du
   * paiement (le locataire peut payer avant ou après l'approbation — voir
   * canPay côté front, disponible dès que la réservation est PENDING) :
   *  - aucun paiement encore créé  → on enregistre juste l'approbation
   *    (hostApprovedAt) ; la confirmation et l'ouverture de la messagerie
   *    interviendront au moment du paiement effectif (createPaymentIntent).
   *  - paiement déjà capturé       → cas robustesse (ne devrait plus être
   *    PENDING normalement) : confirme directement.
   *  - paiement autorisé, pas capturé (capture manuelle Stripe, hors mode
   *    simulate qui capture toujours immédiatement) → on capture maintenant :
   *    PaymentsService.capturePaymentIntent confirme et ouvre la messagerie.
   */
  async approve(id: string, currentUser: AuthenticatedUser) {
    const booking = await this.getBookingAsHost(id, currentUser);

    if (booking.listing.instantBookEnabled) {
      throw new BadRequestException('Cette annonce utilise la confirmation automatique');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Seules les réservations en attente peuvent être approuvées');
    }

    const payment = await this.prisma.payment.findUnique({ where: { bookingId: id } });

    if (!payment) {
      return this.prisma.booking.update({
        where: { id },
        data: { hostApprovedAt: new Date() },
      });
    }

    if (payment.status === PaymentStatus.CAPTURED) {
      const updated = await this.prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.CONFIRMED, hostApprovedAt: new Date() },
      });
      await this.messaging.ensureBookingConversation(id).catch(() => undefined);
      return updated;
    }

    await this.prisma.booking.update({ where: { id }, data: { hostApprovedAt: new Date() } });
    try {
      await this.payments.capturePaymentIntent(id);
    } catch (err) {
      this.logger.error(`Échec de la capture du paiement pour la réservation ${id}`, err as Error);
      throw err;
    }
    return this.prisma.booking.findUniqueOrThrow({ where: { id } });
  }

  async reject(id: string, reason: string, currentUser: AuthenticatedUser) {
    const booking = await this.getBookingAsHost(id, currentUser);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Seules les réservations en attente peuvent être rejetées');
    }
    if (!reason?.trim()) {
      throw new BadRequestException('Un motif de refus est requis');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED, rejectionReason: reason.trim() },
    });
  }

  async cancel(id: string, currentUser: AuthenticatedUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!booking) throw new NotFoundException();
    if (booking.tenantId !== currentUser.id) throw new ForbiddenException();

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException('Cette réservation ne peut plus être annulée');
    }

    // Rembourse selon la politique d'annulation de l'annonce (voir
    // PricingService.refundRate) avant de marquer l'annulation — sans ça, un
    // paiement déjà capturé resterait intégralement chez la plateforme quelle
    // que soit la politique affichée au locataire.
    const hoursUntilStart = (booking.startDate.getTime() - Date.now()) / 3_600_000;
    const rate = this.pricingService.refundRate(booking.listing.cancellationPolicy, hoursUntilStart);
    await this.payments.refundForCancellation(id, rate).catch((err) => {
      this.logger.error(`Échec du remboursement pour l'annulation de la réservation ${id}`, err as Error);
    });
    await this.deposits.releaseForCancellation(id).catch(() => undefined);

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });
  }

  async complete(id: string, currentUser: AuthenticatedUser) {
    const booking = await this.getBookingAsHost(id, currentUser);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Seules les réservations confirmées peuvent être marquées terminées');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.COMPLETED },
    });
  }

  /** Check-in confirmé par le locataire à son arrivée. */
  async checkIn(id: string, currentUser: AuthenticatedUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    if (booking.tenantId !== currentUser.id) throw new ForbiddenException();
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Seules les réservations confirmées peuvent faire l\'objet d\'un check-in');
    }
    if (booking.checkedInAt) {
      throw new BadRequestException('Check-in déjà confirmé');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { checkedInAt: new Date() },
    });
  }

  /** Check-out confirmé par le locataire en fin de créneau. */
  async checkOut(id: string, currentUser: AuthenticatedUser) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    if (booking.tenantId !== currentUser.id) throw new ForbiddenException();
    if (!booking.checkedInAt) {
      throw new BadRequestException('Le check-in doit être confirmé avant le check-out');
    }
    if (booking.checkedOutAt) {
      throw new BadRequestException('Check-out déjà confirmé');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { checkedOutAt: new Date() },
    });
  }

  private async getBookingAsHost(id: string, currentUser: AuthenticatedUser) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { listing: true },
    });

    if (!booking) throw new NotFoundException('Réservation introuvable');
    if (booking.listing.hostId !== currentUser.id) throw new ForbiddenException();

    return booking;
  }
}
