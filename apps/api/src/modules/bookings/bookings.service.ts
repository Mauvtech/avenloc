import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma, BookingStatus, PricingUnit } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { MessagingService } from '@/modules/messaging/messaging.service';
import { PricingService } from './pricing.service';
import type { CreateBookingDto } from './dto/create-booking.dto';
import type { QuoteResponseDto } from './dto/quote.dto';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pricingService: PricingService,
    private readonly messaging: MessagingService,
  ) {}

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

    const days = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    const unitCount = days;
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      throw new BadRequestException('La date de début ne peut pas être dans le passé');
    }
    if (start >= end) {
      throw new BadRequestException('La date de fin doit être postérieure à la date de début');
    }

    if (listing.maxGuests !== null && dto.guestCount > listing.maxGuests) {
      throw new BadRequestException(
        `Ce logement accepte au maximum ${listing.maxGuests} personnes`,
      );
    }

    // Calculate unitCount based on pricingUnit
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    let unitCount: number;
    switch (listing.pricingUnit) {
      case PricingUnit.NIGHT:
      case PricingUnit.DAY:
        unitCount = diffDays;
        break;
      case PricingUnit.HOUR:
        // For hourly, MVP treats as days (full-day hourly blocks not supported at booking level)
        unitCount = diffDays;
        break;
    }

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
          throw new ConflictException('Ces dates ne sont plus disponibles');
        }

        // Jours bloqués par l'hôte (calendrier de disponibilité)
        const blocked = await tx.listingAvailability.findFirst({
          where: {
            listingId: listing.id,
            isAvailable: false,
            AND: [{ startDate: { lt: end } }, { endDate: { gt: start } }],
          },
        });
        if (blocked) {
          throw new ConflictException(
            "L'hôte a rendu une ou plusieurs de ces dates indisponibles",
          );
        }

        const hostApprovalDeadline = listing.instantBookEnabled
          ? null
          : new Date(Date.now() + windowHours * 3600 * 1000);

        return tx.booking.create({
          data: {
            listingId: listing.id,
            tenantId: currentUser.id,
            status: listing.instantBookEnabled ? BookingStatus.CONFIRMED : BookingStatus.PENDING,
            startDate: start,
            endDate: end,
            unitCount,
            guestCount: dto.guestCount,
            guestNote: dto.guestNote,
            arrivalTime: dto.arrivalTime,
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
        throw new ConflictException('Ces dates ne sont plus disponibles');
      }
      throw err;
    }

    // Réservation instantanée : la conversation s'ouvre dès la confirmation.
    if (booking.status === BookingStatus.CONFIRMED) {
      await this.messaging.ensureBookingConversation(booking.id).catch(() => undefined);
    }

    return booking;
  }

  async findAll(currentUser: AuthenticatedUser, role: 'tenant' | 'host') {
    if (role === 'tenant') {
      return this.prisma.booking.findMany({
        where: { tenantId: currentUser.id },
        include: { listing: { select: { title: true, city: true, type: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.booking.findMany({
      where: { listing: { hostId: currentUser.id } },
      include: {
        listing: { select: { title: true, city: true, type: true } },
        tenant: { select: { firstName: true, lastName: true, avatarUrl: true } },
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

  async approve(id: string, currentUser: AuthenticatedUser) {
    const booking = await this.getBookingAsHost(id, currentUser);

    if (booking.listing.instantBookEnabled) {
      throw new BadRequestException('Cette annonce utilise la confirmation automatique');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Seules les réservations en attente peuvent être approuvées');
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CONFIRMED },
    });
    await this.messaging.ensureBookingConversation(id).catch(() => undefined);
    return updated;
  }

  async reject(id: string, currentUser: AuthenticatedUser) {
    const booking = await this.getBookingAsHost(id, currentUser);

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Seules les réservations en attente peuvent être rejetées');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
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
