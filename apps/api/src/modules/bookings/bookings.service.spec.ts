import { Test, type TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { BookingsService } from './bookings.service';
import { PricingService } from './pricing.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { MessagingService } from '@/modules/messaging/messaging.service';
import { PaymentsService } from '@/modules/payments/payments.service';
import { DepositsService } from '@/modules/deposits/deposits.service';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

const mockTenant: AuthenticatedUser = {
  id: 'tenant-id',
  email: 'tenant@test.com',
  roles: ['TENANT'],
};

const mockHost: AuthenticatedUser = {
  id: 'host-id',
  email: 'host@test.com',
  roles: ['HOST'],
};

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const dayAfter = new Date();
dayAfter.setDate(dayAfter.getDate() + 3);

const mockListing = {
  id: 'listing-id',
  hostId: 'host-id',
  status: 'PUBLISHED',
  title: 'Test Listing',
  pricingUnit: 'NIGHT',
  basePrice: new Decimal(100),
  cleaningFee: new Decimal(20),
  serviceFeeRateOverride: null,
  maxGuests: 4,
  instantBookEnabled: true,
};

const mockPricing = {
  unitCount: 2,
  baseAmount: new Decimal(200),
  cleaningFee: new Decimal(20),
  serviceFee: new Decimal(26.4),
  taxAmount: new Decimal(49.28),
  totalAmount: new Decimal(295.68),
  effectiveServiceFeeRate: new Decimal(0.12),
};

function buildMockPrisma() {
  return {
    listing: { findUnique: jest.fn() },
    listingAvailability: { findFirst: jest.fn().mockResolvedValue(null) },
    booking: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payment: { findUnique: jest.fn() },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
}

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: ReturnType<typeof buildMockPrisma>;
  let pricingService: jest.Mocked<PricingService>;
  let messagingService: { ensureBookingConversation: jest.Mock };
  let paymentsService: { capturePaymentIntent: jest.Mock; refundForCancellation: jest.Mock };
  let depositsService: { releaseForCancellation: jest.Mock };

  beforeEach(async () => {
    prisma = buildMockPrisma();
    const mockPricingService = {
      calculate: jest.fn().mockResolvedValue(mockPricing),
      getHostApprovalWindowHours: jest.fn().mockResolvedValue(24),
      refundRate: jest.fn().mockReturnValue(1),
    };
    messagingService = { ensureBookingConversation: jest.fn().mockResolvedValue(undefined) };
    paymentsService = {
      capturePaymentIntent: jest.fn().mockResolvedValue(undefined),
      refundForCancellation: jest.fn().mockResolvedValue(undefined),
    };
    depositsService = { releaseForCancellation: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PricingService, useValue: mockPricingService },
        { provide: MessagingService, useValue: messagingService },
        { provide: PaymentsService, useValue: paymentsService },
        { provide: DepositsService, useValue: depositsService },
      ],
    }).compile();

    service = module.get(BookingsService);
    pricingService = module.get(PricingService) as jest.Mocked<PricingService>;
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    const dto = {
      listingId: 'listing-id',
      startDate: tomorrow.toISOString().split('T')[0],
      endDate: dayAfter.toISOString().split('T')[0],
      guestCount: 2,
    };

    it('creates a PENDING booking for an instant-book listing — payment, not creation, confirms it', async () => {
      const createdBooking = { id: 'booking-1', status: 'PENDING' };
      prisma.listing.findUnique.mockResolvedValue({ ...mockListing, instantBookEnabled: true });
      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        prisma.$queryRaw.mockResolvedValue([]);
        prisma.booking.findFirst.mockResolvedValue(null);
        prisma.booking.create.mockResolvedValue(createdBooking);
        return fn(prisma);
      });

      const result = await service.create(dto, mockTenant);

      // Un instant-book payé zéro fois ne doit jamais devenir CONFIRMED à la
      // création — seul un paiement effectif (createPaymentIntent) confirme.
      expect(result.status).toBe('PENDING');
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', hostApprovalDeadline: null }) }),
      );
      expect(messagingService.ensureBookingConversation).not.toHaveBeenCalled();
    });

    it('creates pending booking for non-instant-book listing with a host approval deadline', async () => {
      const createdBooking = { id: 'booking-1', status: 'PENDING' };
      prisma.listing.findUnique.mockResolvedValue({ ...mockListing, instantBookEnabled: false });
      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        prisma.$queryRaw.mockResolvedValue([]);
        prisma.booking.findFirst.mockResolvedValue(null);
        prisma.booking.create.mockResolvedValue(createdBooking);
        return fn(prisma);
      });

      const result = await service.create(
        { ...dto, activityDescription: 'Séance photo produit pour une marque de vêtements' },
        mockTenant,
      );

      expect(result.status).toBe('PENDING');
      expect(prisma.booking.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING', hostApprovalDeadline: expect.any(Date) }) }),
      );
    });

    it('throws NotFoundException when listing is not published', async () => {
      prisma.listing.findUnique.mockResolvedValue(null);

      await expect(service.create(dto, mockTenant)).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when startDate is in the past', async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing);
      const pastDto = {
        ...dto,
        startDate: '2020-01-01',
        endDate: '2020-01-05',
      };

      await expect(service.create(pastDto, mockTenant)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when startDate >= endDate', async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing);
      const sameDay = tomorrow.toISOString().split('T')[0];
      const badDto = { ...dto, startDate: sameDay, endDate: sameDay };

      await expect(service.create(badDto, mockTenant)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when dates overlap existing booking', async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing);
      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        prisma.$queryRaw.mockResolvedValue([]);
        prisma.booking.findFirst.mockResolvedValue({ id: 'existing' });
        return fn(prisma);
      });

      await expect(service.create(dto, mockTenant)).rejects.toThrow(ConflictException);
    });
  });

  describe('cancel', () => {
    const confirmedBooking = {
      id: 'booking-1',
      tenantId: 'tenant-id',
      status: 'CONFIRMED',
      startDate: dayAfter,
      listing: { cancellationPolicy: 'FLEXIBLE' },
    };

    it('refunds via PaymentsService and releases the deposit when a refund is due', async () => {
      prisma.booking.findUnique.mockResolvedValue(confirmedBooking);
      prisma.booking.update.mockResolvedValue({ ...confirmedBooking, status: 'CANCELLED' });
      pricingService.refundRate.mockReturnValue(1);

      await service.cancel('booking-1', mockTenant);

      expect(pricingService.refundRate).toHaveBeenCalledWith('FLEXIBLE', expect.any(Number));
      expect(paymentsService.refundForCancellation).toHaveBeenCalledWith('booking-1', 1);
      expect(depositsService.releaseForCancellation).toHaveBeenCalledWith('booking-1');
      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
    });

    it('still cancels the booking even if the refund rate is 0 (non-refundable policy)', async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...confirmedBooking,
        listing: { cancellationPolicy: 'NON_REFUNDABLE' },
      });
      prisma.booking.update.mockResolvedValue({ ...confirmedBooking, status: 'CANCELLED' });
      pricingService.refundRate.mockReturnValue(0);

      const result = await service.cancel('booking-1', mockTenant);

      expect(paymentsService.refundForCancellation).toHaveBeenCalledWith('booking-1', 0);
      expect(result.status).toBe('CANCELLED');
    });

    it('cancels the booking even if the refund attempt throws (never lets money issues block cancellation)', async () => {
      prisma.booking.findUnique.mockResolvedValue(confirmedBooking);
      prisma.booking.update.mockResolvedValue({ ...confirmedBooking, status: 'CANCELLED' });
      paymentsService.refundForCancellation.mockRejectedValue(new Error('stripe down'));

      const result = await service.cancel('booking-1', mockTenant);

      expect(result.status).toBe('CANCELLED');
    });

    it('throws ForbiddenException if the booking belongs to another tenant', async () => {
      prisma.booking.findUnique.mockResolvedValue(confirmedBooking);

      await expect(
        service.cancel('booking-1', { ...mockTenant, id: 'other-tenant' }),
      ).rejects.toThrow(ForbiddenException);
      expect(paymentsService.refundForCancellation).not.toHaveBeenCalled();
    });

    it('throws BadRequestException if the booking is already completed', async () => {
      prisma.booking.findUnique.mockResolvedValue({ ...confirmedBooking, status: 'COMPLETED' });

      await expect(service.cancel('booking-1', mockTenant)).rejects.toThrow(BadRequestException);
    });
  });

  describe('approve', () => {
    const pendingBooking = {
      id: 'booking-1',
      status: 'PENDING',
      listing: { hostId: 'host-id', instantBookEnabled: false },
    };

    it("enregistre juste l'approbation (hostApprovedAt) et ne confirme pas si aucun paiement n'existe encore", async () => {
      prisma.booking.findUnique.mockResolvedValue(pendingBooking);
      prisma.payment.findUnique.mockResolvedValue(null);
      prisma.booking.update.mockResolvedValue({ ...pendingBooking, hostApprovedAt: new Date() });

      const result = await service.approve('booking-1', mockHost);

      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: 'booking-1' },
        data: { hostApprovedAt: expect.any(Date) },
      });
      expect(result.status).toBe('PENDING');
      expect(messagingService.ensureBookingConversation).not.toHaveBeenCalled();
      expect(paymentsService.capturePaymentIntent).not.toHaveBeenCalled();
    });

    it('confirme directement et ouvre la messagerie si le paiement est déjà capturé', async () => {
      prisma.booking.findUnique.mockResolvedValue(pendingBooking);
      prisma.payment.findUnique.mockResolvedValue({ bookingId: 'booking-1', status: 'CAPTURED' });
      prisma.booking.update.mockResolvedValue({ ...pendingBooking, status: 'CONFIRMED' });

      const result = await service.approve('booking-1', mockHost);

      expect(result.status).toBe('CONFIRMED');
      expect(messagingService.ensureBookingConversation).toHaveBeenCalledWith('booking-1');
      expect(paymentsService.capturePaymentIntent).not.toHaveBeenCalled();
    });

    it('capture le paiement autorisé (non capturé) via PaymentsService', async () => {
      prisma.booking.findUnique.mockResolvedValue(pendingBooking);
      prisma.payment.findUnique.mockResolvedValue({ bookingId: 'booking-1', status: 'PENDING' });
      prisma.booking.update.mockResolvedValue({ ...pendingBooking, hostApprovedAt: new Date() });
      prisma.booking.findUniqueOrThrow.mockResolvedValue({ ...pendingBooking, status: 'CONFIRMED' });

      const result = await service.approve('booking-1', mockHost);

      expect(paymentsService.capturePaymentIntent).toHaveBeenCalledWith('booking-1');
      expect(result.status).toBe('CONFIRMED');
    });

    it("lance BadRequestException si l'annonce est en instant book", async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...pendingBooking,
        listing: { hostId: 'host-id', instantBookEnabled: true },
      });

      await expect(service.approve('booking-1', mockHost)).rejects.toThrow(BadRequestException);
    });

    it('lance BadRequestException si la réservation n’est plus en attente', async () => {
      prisma.booking.findUnique.mockResolvedValue({ ...pendingBooking, status: 'CONFIRMED' });

      await expect(service.approve('booking-1', mockHost)).rejects.toThrow(BadRequestException);
    });
  });
});
