import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { FeaturesService } from '@/modules/features/features.service';
import { MessagingService } from '@/modules/messaging/messaging.service';
import { StripeClient } from './stripe/stripe.client';
import {
  PaymentIntentResponseDto,
  ConnectOnboardDto,
  ConnectStatusDto,
} from './dto/payment-response.dto';

// Stripe amounts are in smallest currency unit (cents for EUR)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toStripeAmount(decimal: any): number {
  return Math.round(Number(decimal) * 100);
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeClient: StripeClient,
    private readonly config: ConfigService,
    private readonly features: FeaturesService,
    private readonly messaging: MessagingService,
  ) {}

  private get stripe(): Stripe {
    return this.stripeClient.client;
  }

  /** Flag démo : simule l'activation des paiements et les encaissements. */
  private get simulate(): boolean {
    return this.features.isOn('simulatePayments');
  }

  private get frontendUrl(): string {
    return this.config.get<string>('frontend.url') ?? 'http://localhost:3000';
  }

  /** true si une vraie clé Stripe est renseignée (pas le placeholder). */
  private get stripeConfigured(): boolean {
    const key = this.config.get<string>('stripe.secretKey') ?? '';
    return key.startsWith('sk_') && !key.includes('...');
  }

  private assertStripeConfigured(): void {
    if (!this.stripeConfigured) {
      throw new ServiceUnavailableException(
        'Paiements indisponibles : renseignez STRIPE_SECRET_KEY (sk_test_… ou sk_live_…) ' +
          'dans apps/api/.env et activez Stripe Connect, puis redémarrez l’API.',
      );
    }
  }

  /**
   * Convertit une erreur Stripe en réponse HTTP lisible (le message Stripe est
   * renvoyé tel quel au client) au lieu d'un 500 opaque. Les erreurs non-Stripe
   * sont relancées inchangées.
   */
  private rethrowStripe(err: unknown): never {
    if (err instanceof Stripe.errors.StripeError) {
      this.logger.error(`Stripe [${err.type}] ${err.code ?? ''} — ${err.message}`);
      if (
        err instanceof Stripe.errors.StripeConnectionError ||
        err instanceof Stripe.errors.StripeAPIError
      ) {
        throw new ServiceUnavailableException(`Stripe indisponible : ${err.message}`);
      }
      throw new BadRequestException(`Stripe : ${err.message}`);
    }
    throw err as Error;
  }

  /**
   * Vrai si l'erreur indique que le `stripeAccountId` stocké est inutilisable :
   * compte inexistant, ancien compte simulé, ou compte créé dans l'autre mode
   * (live vs test) que la clé courante.
   */
  private isStaleAccountError(err: unknown): boolean {
    if (!(err instanceof Stripe.errors.StripeInvalidRequestError)) return false;
    const m = err.message ?? '';
    return (
      err.code === 'account_invalid' ||
      /no such account/i.test(m) ||
      /created in (live|test) mode/i.test(m) ||
      /(test|live) mode account link/i.test(m) ||
      /similar object exists in (live|test) mode/i.test(m)
    );
  }

  private resetHostStripe(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        stripeAccountId: null,
        stripeAccountStatus: null,
        payoutLast4: null,
        payoutHolderName: null,
      },
    });
  }

  // ── Onboarding hôte — Stripe Connect Express (page hébergée) ────────────────

  /**
   * Crée un compte Connect **Express** si besoin puis renvoie une URL d'onboarding
   * hébergée par Stripe (identité + IBAN saisis chez Stripe, jamais sur Aven).
   */
  async onboardHost(userId: string): Promise<ConnectOnboardDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Flag démo : on "active" le compte immédiatement, sans Stripe.
    if (this.simulate) {
      if (user.stripeAccountStatus !== 'active') {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            stripeAccountId: user.stripeAccountId ?? `sim_acct_${userId}`,
            stripeAccountStatus: 'active',
          },
        });
      }
      return new ConnectOnboardDto(`${this.frontendUrl}/host/connect/return`);
    }

    this.assertStripeConfigured();

    // 2 tentatives : si le compte stocké s'avère inutilisable (compte simulé,
    // créé dans l'autre mode live/test…), on le purge et on en recrée un propre.
    let accountId = user.stripeAccountId;

    for (let attempt = 0; attempt < 2; attempt++) {
      if (accountId) {
        try {
          await this.stripe.accounts.retrieve(accountId);
        } catch (err) {
          if (this.isStaleAccountError(err)) {
            await this.resetHostStripe(userId);
            accountId = null;
          } else {
            this.rethrowStripe(err);
          }
        }
      }

      try {
        if (!accountId) {
          const account = await this.stripe.accounts.create({
            type: 'express',
            country: 'FR',
            email: user.email,
            business_type: 'individual',
            // `transfers` + `card_payments` = setup Express standard (le `transfers`
            // seul est une feature gated qui nécessite une approbation Stripe).
            capabilities: {
              transfers: { requested: true },
              card_payments: { requested: true },
            },
            business_profile: {
              mcc: '6513',
              product_description:
                'Mise en location de locaux sur la plateforme Aven',
            },
          });
          accountId = account.id;
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              stripeAccountId: accountId,
              stripeAccountStatus: 'pending',
              payoutLast4: null,
              payoutHolderName: null,
            },
          });
        }

        const link = await this.stripe.accountLinks.create({
          account: accountId,
          refresh_url: `${this.frontendUrl}/host/connect/refresh`,
          return_url: `${this.frontendUrl}/host/connect/return`,
          type: 'account_onboarding',
        });

        return new ConnectOnboardDto(link.url);
      } catch (err) {
        // Le compte stocké était incompatible (mauvais mode) : purge + 2e tour.
        if (attempt === 0 && this.isStaleAccountError(err)) {
          await this.resetHostStripe(userId);
          accountId = null;
          continue;
        }
        this.rethrowStripe(err);
      }
    }

    throw new InternalServerErrorException('Onboarding Stripe : échec inattendu');
  }

  /**
   * État du compte Connect de l'hôte, lu en direct chez Stripe (et resynchronisé
   * en base). Évite de dépendre du webhook `account.updated` en développement.
   */
  async getConnectStatus(userId: string): Promise<ConnectStatusDto> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    // Flag démo : versements toujours "actifs".
    if (this.simulate) {
      return new ConnectStatusDto({
        connected: true,
        chargesEnabled: true,
        payoutsEnabled: true,
        detailsSubmitted: true,
        status: 'active',
        last4: user.payoutLast4 ?? '0000',
        holderName: user.payoutHolderName ?? `${user.firstName} ${user.lastName}`,
      });
    }

    if (!this.stripeConfigured || !user.stripeAccountId) {
      return new ConnectStatusDto({
        connected: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        status: null,
        last4: user.payoutLast4,
        holderName: user.payoutHolderName,
      });
    }

    let account: Stripe.Account;
    try {
      account = await this.stripe.accounts.retrieve(user.stripeAccountId);
    } catch (err) {
      // Identifiant obsolète / invalide (compte simulé, mauvais mode…) → purge.
      if (this.isStaleAccountError(err)) {
        this.logger.warn(
          `Compte Stripe invalide pour l'utilisateur ${userId} (${user.stripeAccountId}) — réinitialisé`,
        );
        await this.resetHostStripe(userId);
        return new ConnectStatusDto({
          connected: false,
          chargesEnabled: false,
          payoutsEnabled: false,
          detailsSubmitted: false,
          status: null,
          last4: null,
          holderName: null,
        });
      }
      throw err;
    }

    const chargesEnabled = account.charges_enabled ?? false;
    const payoutsEnabled = account.payouts_enabled ?? false;
    const detailsSubmitted = account.details_submitted ?? false;

    const status =
      chargesEnabled && payoutsEnabled
        ? 'active'
        : detailsSubmitted
          ? 'pending'
          : 'restricted';

    // Compte bancaire externe (renseigné par l'hôte chez Stripe) — pour l'affichage.
    const ext = account.external_accounts?.data?.[0] as Stripe.BankAccount | undefined;
    const last4 = ext?.last4 ?? user.payoutLast4 ?? null;
    const holderName = ext?.account_holder_name ?? user.payoutHolderName ?? null;

    if (
      status !== user.stripeAccountStatus ||
      last4 !== user.payoutLast4 ||
      holderName !== user.payoutHolderName
    ) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          stripeAccountStatus: status,
          payoutLast4: last4,
          payoutHolderName: holderName,
        },
      });
    }

    return new ConnectStatusDto({
      connected: true,
      chargesEnabled,
      payoutsEnabled,
      detailsSubmitted,
      status,
      last4,
      holderName,
    });
  }

  // ── PaymentIntent creation ───────────────────────────────────────────────────

  async createPaymentIntent(
    bookingId: string,
    tenantId: string,
  ): Promise<PaymentIntentResponseDto> {
    if (!this.simulate) this.assertStripeConfigured();

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        listing: {
          include: { host: true },
        },
        tenant: true,
        payment: true,
      },
    });

    if (!booking) throw new NotFoundException('Réservation introuvable');
    if (booking.tenantId !== tenantId) {
      throw new ForbiddenException('Cette réservation ne vous appartient pas');
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        'Un PaymentIntent ne peut être créé que pour une réservation en attente',
      );
    }
    if (booking.payment) {
      throw new BadRequestException(
        'Un PaymentIntent existe déjà pour cette réservation',
      );
    }

    // Flag démo : encaissement fictif immédiat, réservation confirmée.
    if (this.simulate) {
      const hostPayout =
        Number(booking.totalAmount) - Number(booking.serviceFee);
      await this.prisma.$transaction([
        this.prisma.payment.create({
          data: {
            bookingId: booking.id,
            status: PaymentStatus.CAPTURED,
            stripePaymentIntentId: `sim_pi_${booking.id}`,
            amount: booking.totalAmount,
            platformFee: booking.serviceFee,
            hostPayout,
            currency: 'EUR',
            capturedAt: new Date(),
          },
        }),
        this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CONFIRMED },
        }),
      ]);
      await this.messaging
        .ensureBookingConversation(booking.id)
        .catch(() => undefined);
      return new PaymentIntentResponseDto({
        clientSecret: null,
        paymentIntentId: `sim_pi_${booking.id}`,
        simulated: true,
      });
    }

    const host = booking.listing.host;
    if (!host.stripeAccountId) {
      throw new BadRequestException(
        "L'hôte n'a pas encore configuré ses informations de versement",
      );
    }

    const captureMethod = booking.listing.instantBookEnabled
      ? 'automatic'
      : 'manual';

    let paymentIntent: Stripe.PaymentIntent;
    try {
      // Ensure tenant has a Stripe customer
      let stripeCustomerId = booking.tenant.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await this.stripe.customers.create({
          email: booking.tenant.email,
          name: `${booking.tenant.firstName} ${booking.tenant.lastName}`,
          metadata: { userId: booking.tenant.id },
        });
        stripeCustomerId = customer.id;
        await this.prisma.user.update({
          where: { id: tenantId },
          data: { stripeCustomerId },
        });
      }

      paymentIntent = await this.stripe.paymentIntents.create({
        amount: toStripeAmount(booking.totalAmount),
        currency: 'eur',
        customer: stripeCustomerId,
        capture_method: captureMethod,
        application_fee_amount: toStripeAmount(booking.serviceFee),
        transfer_data: { destination: host.stripeAccountId },
        metadata: { bookingId: booking.id, listingId: booking.listingId },
      });
    } catch (err) {
      this.rethrowStripe(err);
    }

    await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        status: PaymentStatus.PENDING,
        stripePaymentIntentId: paymentIntent.id,
        amount: booking.totalAmount,
        platformFee: booking.serviceFee,
        hostPayout: Number(booking.totalAmount) - Number(booking.serviceFee),
        currency: 'EUR',
      },
    });

    if (!paymentIntent.client_secret) {
      throw new InternalServerErrorException('Stripe client_secret manquant');
    }

    return new PaymentIntentResponseDto({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  }

  // ── Manual capture (host approval flow) ─────────────────────────────────────

  async capturePaymentIntent(bookingId: string): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
      include: {
        booking: {
          include: { listing: { include: { host: true } } },
        },
      },
    });

    if (!payment || !payment.stripePaymentIntentId) {
      throw new NotFoundException('Payment introuvable pour cette réservation');
    }

    const captured = await this.stripe.paymentIntents.capture(
      payment.stripePaymentIntentId,
    );

    const host = payment.booking.listing.host;
    if (!host.stripeAccountId) {
      throw new BadRequestException('Stripe account hôte manquant');
    }

    // Transfer funds to host after capture
    const transfer = await this.stripe.transfers.create({
      amount: toStripeAmount(payment.hostPayout),
      currency: 'eur',
      destination: host.stripeAccountId,
      source_transaction: (captured.latest_charge as string) ?? undefined,
      metadata: { bookingId },
    });

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { bookingId },
        data: {
          status: PaymentStatus.CAPTURED,
          stripeTransferId: transfer.id,
          capturedAt: new Date(),
        },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CONFIRMED },
      }),
    ]);
    await this.messaging.ensureBookingConversation(bookingId).catch(() => undefined);
  }

  // ── Stripe webhook handlers ──────────────────────────────────────────────────

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    const secret = this.config.get<string>('stripe.webhookSecret') ?? '';
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'payment_intent.amount_capturable_updated':
        // Funds authorized (manual capture mode) — booking stays PENDING until host approves
        await this.handleAmountCapturableUpdated(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'payment_intent.canceled':
        await this.handlePaymentIntentCanceled(
          event.data.object as Stripe.PaymentIntent,
        );
        break;

      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'account.updated':
        await this.handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      default:
        this.logger.log(`Unhandled Stripe event: ${event.type}`);
    }
  }

  /**
   * Compte Connect d'un hôte mis à jour chez Stripe (onboarding avancé/terminé,
   * pièce demandée…) → on resynchronise `stripeAccountStatus` + l'IBAN affiché,
   * pour que « paiements finalisés » soit à jour côté client sans que l'hôte
   * ait à rouvrir son tableau de bord.
   */
  private async handleAccountUpdated(account: Stripe.Account): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { stripeAccountId: account.id },
    });
    if (!user) return;

    const status =
      account.charges_enabled && account.payouts_enabled
        ? 'active'
        : account.details_submitted
          ? 'pending'
          : 'restricted';

    const ext = account.external_accounts?.data?.[0] as
      | Stripe.BankAccount
      | undefined;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        stripeAccountStatus: status,
        payoutLast4: ext?.last4 ?? user.payoutLast4,
        payoutHolderName: ext?.account_holder_name ?? user.payoutHolderName,
      },
    });
  }

  private async handlePaymentIntentSucceeded(
    intent: Stripe.PaymentIntent,
  ): Promise<void> {
    // Only process automatic capture — manual capture is handled via capturePaymentIntent()
    if (intent.capture_method === 'manual') return;

    const bookingId = intent.metadata['bookingId'];
    if (!bookingId) return;

    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: intent.id },
      include: { booking: { include: { listing: { include: { host: true } } } } },
    });
    if (!payment) return;

    const host = payment.booking.listing.host;
    if (!host.stripeAccountId) {
      this.logger.warn(`Host has no Stripe account for booking ${bookingId}`);
      return;
    }

    const latestCharge =
      typeof intent.latest_charge === 'string' ? intent.latest_charge : undefined;

    const transfer = await this.stripe.transfers.create({
      amount: toStripeAmount(payment.hostPayout),
      currency: 'eur',
      destination: host.stripeAccountId,
      source_transaction: latestCharge,
      metadata: { bookingId },
    });

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.CAPTURED,
          stripeTransferId: transfer.id,
          capturedAt: new Date(),
        },
      }),
      this.prisma.booking.update({
        where: { id: bookingId },
        data: { status: BookingStatus.CONFIRMED },
      }),
    ]);
    await this.messaging.ensureBookingConversation(bookingId).catch(() => undefined);
  }

  private async handleAmountCapturableUpdated(
    intent: Stripe.PaymentIntent,
  ): Promise<void> {
    const bookingId = intent.metadata['bookingId'];
    if (!bookingId) return;
    // Funds authorized — log and await host approval
    this.logger.log(
      `Funds authorized for booking ${bookingId}, awaiting host approval`,
    );
  }

  private async handlePaymentIntentCanceled(
    intent: Stripe.PaymentIntent,
  ): Promise<void> {
    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: intent.id },
    });
    if (!payment) return;

    const booking = await this.prisma.booking.findUnique({
      where: { id: payment.bookingId },
    });
    if (!booking || booking.status !== BookingStatus.PENDING) return;

    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.FAILED },
      }),
      this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { status: BookingStatus.CANCELLED },
      }),
    ]);
  }

  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    const intentId =
      typeof charge.payment_intent === 'string'
        ? charge.payment_intent
        : charge.payment_intent?.id;
    if (!intentId) return;

    const payment = await this.prisma.payment.findUnique({
      where: { stripePaymentIntentId: intentId },
    });
    if (!payment) return;

    const refundedCents = charge.amount_refunded;
    const refundedAmount = refundedCents / 100;
    const isFullRefund = refundedAmount >= Number(payment.amount);

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundedAmount,
        status: isFullRefund
          ? PaymentStatus.REFUNDED
          : PaymentStatus.PARTIALLY_REFUNDED,
        refundedAt: new Date(),
      },
    });
  }
}
