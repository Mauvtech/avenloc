import { Test, type TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { StripeClient } from './stripe/stripe.client';
import { FeaturesService } from '@/modules/features/features.service';
import { MessagingService } from '@/modules/messaging/messaging.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStripeMock() {
  return {
    paymentIntents: {
      create: jest.fn(),
      capture: jest.fn(),
    },
    transfers: {
      create: jest.fn(),
    },
    customers: {
      create: jest.fn(),
    },
    accounts: {
      create: jest.fn(),
    },
    accountLinks: {
      create: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };
}

function buildPrismaMock() {
  return {
    user: { findUnique: jest.fn(), update: jest.fn() },
    booking: { findUnique: jest.fn(), update: jest.fn() },
    payment: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn().mockImplementation(async (ops: unknown[]) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      return (ops as () => Promise<unknown>)();
    }),
  };
}

const HOST_USER = {
  id: 'host-id',
  email: 'host@example.com',
  firstName: 'Host',
  lastName: 'User',
  stripeAccountId: 'acct_test123',
  stripeCustomerId: null,
};

const TENANT_USER = {
  id: 'tenant-id',
  email: 'tenant@example.com',
  firstName: 'Tenant',
  lastName: 'User',
  stripeCustomerId: null,
  stripeAccountId: null,
};

const LISTING = {
  id: 'listing-id',
  hostId: HOST_USER.id,
  instantBookEnabled: true,
  host: HOST_USER,
};

const BOOKING = {
  id: 'booking-id',
  tenantId: TENANT_USER.id,
  listingId: LISTING.id,
  status: BookingStatus.PENDING,
  totalAmount: '100.00',
  serviceFee: '12.00',
  listing: LISTING,
  tenant: TENANT_USER,
  payment: null,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let stripeMock: ReturnType<typeof makeStripeMock>;

  beforeEach(async () => {
    prisma = buildPrismaMock();
    stripeMock = makeStripeMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: StripeClient,
          useValue: { client: stripeMock },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'stripe.secretKey' ? 'sk_test_dummy' : 'http://localhost:3000',
            ),
          },
        },
        {
          provide: FeaturesService,
          useValue: { isOn: jest.fn().mockReturnValue(false), all: jest.fn(), set: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(PaymentsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── createPaymentIntent ──────────────────────────────────────────────────────

  describe('createPaymentIntent', () => {
    beforeEach(() => {
      prisma.booking.findUnique.mockResolvedValue(BOOKING);
      prisma.user.update.mockResolvedValue({ ...TENANT_USER, stripeCustomerId: 'cus_test' });
      stripeMock.customers.create.mockResolvedValue({ id: 'cus_test' });
      prisma.payment.create.mockResolvedValue({});
    });

    it('crée un PaymentIntent en mode automatic pour un instant-book', async () => {
      stripeMock.paymentIntents.create.mockResolvedValue({
        id: 'pi_test',
        client_secret: 'pi_test_secret',
      });

      const result = await service.createPaymentIntent('booking-id', 'tenant-id');

      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          capture_method: 'automatic',
          amount: 10000, // 100.00 × 100
          application_fee_amount: 1200, // 12.00 × 100
        }),
      );
      expect(result.clientSecret).toBe('pi_test_secret');
    });

    it('crée un PaymentIntent en mode manual pour validation hôte', async () => {
      const nonInstantBooking = {
        ...BOOKING,
        listing: { ...LISTING, instantBookEnabled: false },
      };
      prisma.booking.findUnique.mockResolvedValue(nonInstantBooking);
      stripeMock.paymentIntents.create.mockResolvedValue({
        id: 'pi_test2',
        client_secret: 'pi_test2_secret',
      });

      const result = await service.createPaymentIntent('booking-id', 'tenant-id');

      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ capture_method: 'manual' }),
      );
      expect(result.clientSecret).toBe('pi_test2_secret');
    });

    it('lance NotFoundException si la réservation est introuvable', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);
      await expect(
        service.createPaymentIntent('unknown-id', 'tenant-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lance ForbiddenException si le tenant ne correspond pas', async () => {
      await expect(
        service.createPaymentIntent('booking-id', 'other-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lance BadRequestException si le booking n\'est pas PENDING', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...BOOKING,
        status: BookingStatus.CONFIRMED,
      });
      await expect(
        service.createPaymentIntent('booking-id', 'tenant-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('application_fee_amount est bien serviceFee × 100 (en centimes)', async () => {
      stripeMock.paymentIntents.create.mockResolvedValue({
        id: 'pi_test',
        client_secret: 'pi_test_secret',
      });

      await service.createPaymentIntent('booking-id', 'tenant-id');

      const call = stripeMock.paymentIntents.create.mock.calls[0][0] as { application_fee_amount: number };
      expect(call.application_fee_amount).toBe(1200); // 12.00 × 100
    });
  });

  // ── capturePaymentIntent ─────────────────────────────────────────────────────

  describe('capturePaymentIntent', () => {
    const PAYMENT = {
      id: 'payment-id',
      bookingId: 'booking-id',
      stripePaymentIntentId: 'pi_test',
      hostPayout: '88.00',
      booking: { listing: { host: HOST_USER } },
    };

    it('capture le PaymentIntent et crée un Transfer vers l\'hôte', async () => {
      prisma.payment.findUnique.mockResolvedValue(PAYMENT);
      stripeMock.paymentIntents.capture.mockResolvedValue({
        id: 'pi_test',
        latest_charge: 'ch_test',
      });
      stripeMock.transfers.create.mockResolvedValue({ id: 'tr_test' });

      await service.capturePaymentIntent('booking-id');

      expect(stripeMock.paymentIntents.capture).toHaveBeenCalledWith('pi_test');
      expect(stripeMock.transfers.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 8800, // 88.00 × 100
          destination: HOST_USER.stripeAccountId,
        }),
      );
    });

    it('lance NotFoundException si aucun payment n\'existe', async () => {
      prisma.payment.findUnique.mockResolvedValue(null);
      await expect(
        service.capturePaymentIntent('unknown-booking'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
