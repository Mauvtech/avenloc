import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { Booking, Deposit, Listing } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { FeaturesService } from '@/modules/features/features.service';
import { MessagingService } from '@/modules/messaging/messaging.service';
import { StripeClient } from '@/modules/payments/stripe/stripe.client';
import type { RequestCaptureDto } from './dto/request-capture.dto';
import type { DepositResponseDto } from './dto/deposit-response.dto';

type BookingWithListing = Booking & { listing: Listing };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStripeAmount(decimal: any): number {
  return Math.round(Number(decimal) * 100);
}

@Injectable()
export class DepositsService {
  private readonly logger = new Logger(DepositsService.name);

  // Marge de sécurité sous la limite Stripe de ~7 jours pour une empreinte carte.
  private static readonly HOLD_DAYS = 6;
  // Délai laissé au locataire pour accepter/contester une réclamation.
  private static readonly CONTEST_WINDOW_HOURS = 48;
  // Délai après la fin du séjour avant libération automatique sans réclamation.
  private static readonly RELEASE_GRACE_HOURS = 48;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeClient: StripeClient,
    private readonly features: FeaturesService,
    private readonly messaging: MessagingService,
    private readonly storage: StorageService,
  ) {}

  private get stripe(): Stripe {
    return this.stripeClient.client;
  }

  private get simulate(): boolean {
    return this.features.isOn('simulatePayments');
  }

  // ── Consultation ────────────────────────────────────────────────────────────

  async getForUser(bookingId: string, userId: string): Promise<DepositResponseDto | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: true, deposit: true },
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    if (booking.tenantId !== userId && booking.listing.hostId !== userId) {
      throw new ForbiddenException('Cette réservation ne vous appartient pas');
    }
    return booking.deposit ? this.toDto(booking.deposit) : null;
  }

  // ── Pose de l'empreinte ──────────────────────────────────────────────────────

  /**
   * Appelé juste après la confirmation du paiement principal. Ne fait rien si
   * l'annonce ne demande pas de caution, si une empreinte existe déjà, ou si la
   * réservation est trop lointaine (l'empreinte expirerait avant le séjour — le
   * job `authorizePendingDeposits` la posera au bon moment).
   */
  async authorizeForBooking(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: true, deposit: true },
    });
    if (!booking || booking.deposit) return;
    const depositAmount = booking.listing.depositAmount;
    if (!depositAmount || Number(depositAmount) <= 0) return;

    const daysUntilStart = Math.ceil(
      (booking.startAt.getTime() - Date.now()) / 86_400_000,
    );
    if (daysUntilStart > DepositsService.HOLD_DAYS) return;

    await this.placeHold(booking);
  }

  private async placeHold(booking: BookingWithListing): Promise<void> {
    const amount = Number(booking.listing.depositAmount);
    const expiresAt = new Date(Date.now() + DepositsService.HOLD_DAYS * 86_400_000);

    if (this.simulate) {
      await this.prisma.deposit.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          amount,
          status: 'AUTHORIZED',
          stripePaymentIntentId: `sim_dep_${booking.id}`,
          authorizedAt: new Date(),
          expiresAt,
        },
        update: {
          status: 'AUTHORIZED',
          authorizedAt: new Date(),
          expiresAt,
          capturedAmount: null,
          capturedAt: null,
        },
      });
      return;
    }

    // Empreinte réelle : réutilise le moyen de paiement du paiement principal
    // (même carte, même client Stripe) pour une autorisation off-session.
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId: booking.id },
    });
    if (!payment?.stripePaymentIntentId) {
      this.logger.warn(
        `Pas de paiement principal pour la réservation ${booking.id} — caution non posée`,
      );
      return;
    }

    try {
      const mainIntent = await this.stripe.paymentIntents.retrieve(
        payment.stripePaymentIntentId,
      );
      const paymentMethod =
        typeof mainIntent.payment_method === 'string'
          ? mainIntent.payment_method
          : mainIntent.payment_method?.id;
      const customer =
        typeof mainIntent.customer === 'string'
          ? mainIntent.customer
          : mainIntent.customer?.id;

      if (!paymentMethod || !customer) {
        this.logger.warn(
          `Moyen de paiement introuvable pour poser la caution — réservation ${booking.id}`,
        );
        return;
      }

      const intent = await this.stripe.paymentIntents.create({
        amount: toStripeAmount(amount),
        currency: 'eur',
        customer,
        payment_method: paymentMethod,
        capture_method: 'manual',
        confirm: true,
        off_session: true,
        metadata: { bookingId: booking.id, kind: 'deposit' },
      });

      await this.prisma.deposit.upsert({
        where: { bookingId: booking.id },
        create: {
          bookingId: booking.id,
          amount,
          status: 'AUTHORIZED',
          stripePaymentIntentId: intent.id,
          authorizedAt: new Date(),
          expiresAt,
        },
        update: {
          status: 'AUTHORIZED',
          stripePaymentIntentId: intent.id,
          authorizedAt: new Date(),
          expiresAt,
          capturedAmount: null,
          capturedAt: null,
        },
      });
    } catch (err) {
      // On ne bloque jamais la réservation pour un échec de caution : on log et
      // on retentera au prochain passage du job de renouvellement.
      this.logger.error(
        `Échec de pose de la caution pour la réservation ${booking.id} : ${
          err instanceof Stripe.errors.StripeError ? err.message : String(err)
        }`,
      );
    }
  }

  // ── Réclamation hôte ─────────────────────────────────────────────────────────

  async requestCapture(
    bookingId: string,
    hostId: string,
    dto: RequestCaptureDto,
    files: Express.Multer.File[],
  ): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: true, deposit: true },
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    if (booking.listing.hostId !== hostId) {
      throw new ForbiddenException('Cette réservation ne vous appartient pas');
    }
    const deposit = booking.deposit;
    if (!deposit) throw new NotFoundException('Aucune caution pour cette réservation');
    if (deposit.status !== 'AUTHORIZED') {
      throw new BadRequestException('Cette caution a déjà été traitée');
    }
    if (dto.amount > Number(deposit.amount)) {
      throw new BadRequestException(
        `Le montant demandé ne peut pas dépasser la caution (${deposit.amount} €)`,
      );
    }
    if (files.length === 0) {
      throw new BadRequestException('Au moins une photo justificative est requise');
    }

    const proofUrls: string[] = [];
    for (const file of files) {
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException('Les preuves doivent être des images');
      }
      const key = `deposits/${deposit.id}/${Date.now()}-${proofUrls.length}.jpg`;
      proofUrls.push(await this.storage.upload(key, file.buffer, file.mimetype));
    }

    await this.prisma.deposit.update({
      where: { id: deposit.id },
      data: {
        status: 'CAPTURE_REQUESTED',
        captureReason: dto.reason,
        captureRequestedAt: new Date(),
        capturedAmount: dto.amount,
        proofUrls,
      },
    });

    await this.messaging.postSystemMessage(
      bookingId,
      `réclamation sur la caution — ${dto.amount} € (${dto.reason}). ` +
        `« ${dto.description} » Vous avez 48h pour accepter ou contester depuis votre réservation.`,
    );
  }

  // ── Réponse locataire ────────────────────────────────────────────────────────

  async respond(
    bookingId: string,
    tenantId: string,
    decision: 'accept' | 'contest',
    contestReason?: string,
  ): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { deposit: true },
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    if (booking.tenantId !== tenantId) {
      throw new ForbiddenException('Cette réservation ne vous appartient pas');
    }
    const deposit = booking.deposit;
    if (!deposit || deposit.status !== 'CAPTURE_REQUESTED') {
      throw new BadRequestException('Aucune réclamation en attente de réponse');
    }

    if (decision === 'accept') {
      await this.capture(deposit.id, Number(deposit.capturedAmount ?? deposit.amount));
      await this.messaging.postSystemMessage(
        bookingId,
        'le locataire a accepté la réclamation — capture effectuée.',
      );
    } else {
      if (!contestReason?.trim()) {
        throw new BadRequestException('Merci de préciser le motif de contestation');
      }
      await this.prisma.deposit.update({
        where: { id: deposit.id },
        data: { status: 'CONTESTED', contestReason, contestedAt: new Date() },
      });
      await this.messaging.postSystemMessage(
        bookingId,
        `réclamation contestée : « ${contestReason} ». Un médiateur Aven va examiner le dossier.`,
      );
    }
  }

  // ── Capture / libération ─────────────────────────────────────────────────────

  private async capture(depositId: string, amount: number): Promise<void> {
    const deposit = await this.prisma.deposit.findUnique({ where: { id: depositId } });
    if (!deposit || deposit.status !== 'CAPTURE_REQUESTED') return;

    if (
      !this.simulate &&
      deposit.stripePaymentIntentId &&
      !deposit.stripePaymentIntentId.startsWith('sim_')
    ) {
      await this.stripe.paymentIntents.capture(deposit.stripePaymentIntentId, {
        amount_to_capture: toStripeAmount(amount),
      });
    }

    await this.prisma.deposit.update({
      where: { id: depositId },
      data: { status: 'CAPTURED', capturedAmount: amount, capturedAt: new Date() },
    });
  }

  private async release(depositId: string): Promise<void> {
    const deposit = await this.prisma.deposit.findUnique({ where: { id: depositId } });
    if (!deposit || deposit.status !== 'AUTHORIZED') return;

    if (
      !this.simulate &&
      deposit.stripePaymentIntentId &&
      !deposit.stripePaymentIntentId.startsWith('sim_')
    ) {
      await this.stripe.paymentIntents
        .cancel(deposit.stripePaymentIntentId)
        .catch(() => undefined);
    }

    await this.prisma.deposit.update({
      where: { id: depositId },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });
    await this.messaging
      .postSystemMessage(
        deposit.bookingId,
        'caution libérée — aucune réclamation dans le délai prévu.',
      )
      .catch(() => undefined);
  }

  // ── Jobs planifiés (voir jobs/deposit-lifecycle.job.ts) ─────────────────────

  /** Pose l'empreinte pour les réservations confirmées dont le séjour approche. */
  async authorizePendingDeposits(): Promise<void> {
    const horizon = new Date(Date.now() + DepositsService.HOLD_DAYS * 86_400_000);
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        startAt: { lte: horizon },
        endAt: { gte: new Date() },
        listing: { depositAmount: { gt: 0 } },
        deposit: null,
      },
      include: { listing: true },
    });
    for (const booking of bookings) {
      await this.placeHold(booking).catch((err) =>
        this.logger.error(`authorizePendingDeposits(${booking.id}) : ${err}`),
      );
    }
  }

  /** Renouvelle les empreintes sur le point d'expirer avant la fin du séjour. */
  async renewExpiringHolds(): Promise<void> {
    if (this.simulate) return; // pas d'expiration réelle en mode démo
    const soon = new Date(Date.now() + 24 * 3_600_000);
    const deposits = await this.prisma.deposit.findMany({
      where: { status: 'AUTHORIZED', expiresAt: { lte: soon } },
      include: { booking: { include: { listing: true } } },
    });
    for (const deposit of deposits) {
      if (deposit.booking.status !== 'CONFIRMED') continue;
      try {
        if (deposit.stripePaymentIntentId) {
          await this.stripe.paymentIntents
            .cancel(deposit.stripePaymentIntentId)
            .catch(() => undefined);
        }
        await this.placeHold(deposit.booking);
      } catch (err) {
        this.logger.error(`renewExpiringHolds(${deposit.id}) : ${err}`);
        await this.prisma.deposit.update({
          where: { id: deposit.id },
          data: { status: 'EXPIRED' },
        });
        await this.messaging
          .postSystemMessage(
            deposit.bookingId,
            'la caution n’a pas pu être renouvelée automatiquement (carte refusée ou expirée). Contactez l’hôte si besoin.',
          )
          .catch(() => undefined);
      }
    }
  }

  /** Capture automatiquement les réclamations non traitées après 48h. */
  async autoResolveExpiredClaims(): Promise<void> {
    const deadline = new Date(
      Date.now() - DepositsService.CONTEST_WINDOW_HOURS * 3_600_000,
    );
    const pending = await this.prisma.deposit.findMany({
      where: { status: 'CAPTURE_REQUESTED', captureRequestedAt: { lte: deadline } },
    });
    for (const deposit of pending) {
      await this.capture(deposit.id, Number(deposit.capturedAmount ?? deposit.amount)).catch(
        (err) => this.logger.error(`autoResolveExpiredClaims(${deposit.id}) : ${err}`),
      );
      await this.messaging
        .postSystemMessage(
          deposit.bookingId,
          `capture automatique de ${deposit.capturedAmount ?? deposit.amount} € — délai de contestation dépassé sans réponse.`,
        )
        .catch(() => undefined);
    }
  }

  /** Libère les empreintes des séjours terminés depuis longtemps sans réclamation. */
  async releaseUnclaimedDeposits(): Promise<void> {
    const cutoff = new Date(
      Date.now() - DepositsService.RELEASE_GRACE_HOURS * 3_600_000,
    );
    const deposits = await this.prisma.deposit.findMany({
      where: {
        status: 'AUTHORIZED',
        booking: { status: 'COMPLETED', endAt: { lte: cutoff } },
      },
    });
    for (const deposit of deposits) {
      await this.release(deposit.id).catch((err) =>
        this.logger.error(`releaseUnclaimedDeposits(${deposit.id}) : ${err}`),
      );
    }
  }

  private toDto(deposit: Deposit): DepositResponseDto {
    return {
      id: deposit.id,
      bookingId: deposit.bookingId,
      status: deposit.status,
      amount: deposit.amount.toString(),
      capturedAmount: deposit.capturedAmount?.toString() ?? null,
      captureReason: deposit.captureReason,
      captureRequestedAt: deposit.captureRequestedAt,
      contestReason: deposit.contestReason,
      contestedAt: deposit.contestedAt,
      capturedAt: deposit.capturedAt,
      releasedAt: deposit.releasedAt,
      proofUrls: deposit.proofUrls,
      createdAt: deposit.createdAt,
    };
  }
}
