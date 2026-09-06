import { Test, type TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { BookingsService } from './bookings.service';
import { PricingService } from './pricing.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { MessagingService } from '@/modules/messaging/messaging.service';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

const mockTenant: AuthenticatedUser = {
  id: 'tenant-id',
  email: 'tenant@test.com',
  roles: ['TENANT'],
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
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };
}

describe('BookingsService', () => {
  let service: BookingsService;
  let prisma: ReturnType<typeof buildMockPrisma>;
  let pricingService: jest.Mocked<PricingService>;

  beforeEach(async () => {
    prisma = buildMockPrisma();
    const mockPricingService = {
      calculate: jest.fn().mockResolvedValue(mockPricing),
      getHostApprovalWindowHours: jest.fn().mockResolvedValue(24),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PricingService, useValue: mockPricingService },
        {
          provide: MessagingService,
          useValue: { ensureBookingConversation: jest.fn().mockResolvedValue(undefined) },
        },
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

    it('creates confirmed booking for instant-book listing', async () => {
      const createdBooking = { id: 'booking-1', status: 'CONFIRMED' };
      prisma.listing.findUnique.mockResolvedValue({ ...mockListing, instantBookEnabled: true });
      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        prisma.$queryRaw.mockResolvedValue([]);
        prisma.booking.findFirst.mockResolvedValue(null);
        prisma.booking.create.mockResolvedValue(createdBooking);
        return fn(prisma);
      });

      const result = await service.create(dto, mockTenant);

      expect(result.status).toBe('CONFIRMED');
    });

    it('creates pending booking for non-instant-book listing', async () => {
      const createdBooking = { id: 'booking-1', status: 'PENDING' };
      prisma.listing.findUnique.mockResolvedValue({ ...mockListing, instantBookEnabled: false });
      prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
        prisma.$queryRaw.mockResolvedValue([]);
        prisma.booking.findFirst.mockResolvedValue(null);
        prisma.booking.create.mockResolvedValue(createdBooking);
        return fn(prisma);
      });

      const result = await service.create(dto, mockTenant);

      expect(result.status).toBe('PENDING');
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
});
