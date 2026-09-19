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
import type { CreateBookingDto } from './dto/create-booking.dto';

const mockTenant: AuthenticatedUser = {
  id: 'tenant-id',
  email: 'tenant@test.com',
  roles: ['TENANT'],
};

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowDate = tomorrow.toISOString().split('T')[0];

const mockListing = {
  id: 'listing-id',
  hostId: 'host-id',
  status: 'PUBLISHED',
  title: 'Test Listing',
  pricingUnit: 'HOUR',
  basePrice: new Decimal(20),
  cleaningFee: new Decimal(0),
  serviceFeeRateOverride: null,
  maxGuests: 4,
  instantBookEnabled: true,
  openDays: [0, 1, 2, 3, 4, 5, 6],
  openStartTime: '00:00',
  openEndTime: '23:59',
  minDurationMinutes: 60,
  minNoticeHours: 0,
  activityValidationRequired: false,
  rcProRequired: false,
};

const mockPricing = {
  unitCount: 2,
  baseAmount: new Decimal(40),
  cleaningFee: new Decimal(0),
  serviceFee: new Decimal(4.8),
  taxAmount: new Decimal(8.96),
  totalAmount: new Decimal(53.76),
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
    const dto: CreateBookingDto = {
      listingId: 'listing-id',
      date: tomorrowDate,
      startTime: '10:00',
      endTime: '12:00',
      guestCount: 2,
      houseRulesAccepted: true,
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

    it('throws BadRequestException when the slot is in the past', async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing);
      const pastDto = { ...dto, date: '2020-01-01' };

      await expect(service.create(pastDto, mockTenant)).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when startTime >= endTime', async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing);
      const badDto = { ...dto, startTime: '10:00', endTime: '10:00' };

      await expect(service.create(badDto, mockTenant)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when the slot overlaps an existing booking', async () => {
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
