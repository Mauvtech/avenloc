import { Test, type TestingModule } from '@nestjs/testing';
import { Decimal } from '@prisma/client/runtime/library';
import { PricingService } from './pricing.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { RedisService } from '@/infrastructure/cache/redis.service';
import type { Listing } from '@prisma/client';

function makeDecimal(n: string | number): Decimal {
  return new Decimal(n.toString());
}

const baseListing: Listing = {
  id: 'listing-1',
  hostId: 'host-1',
  type: 'APARTMENT',
  status: 'PUBLISHED',
  title: 'Test Apartment',
  description: 'desc',
  addressLine1: '1 rue de la Paix',
  addressLine2: null,
  city: 'Paris',
  postalCode: '75001',
  country: 'FR',
  latitude: 48.8566,
  longitude: 2.3522,
  maxGuests: 4,
  pricingUnit: 'NIGHT',
  basePrice: makeDecimal(100),
  cleaningFee: makeDecimal(20),
  serviceFeeRateOverride: null,
  cancellationPolicy: 'MODERATE',
  instantBookEnabled: false,
  amenities: [],
  specificAttributes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPlatformConfig = {
  serviceFeeRate: '0.12',
  taxRate: '0.20',
  hostApprovalWindowHours: 24,
};

describe('PricingService', () => {
  let service: PricingService;
  let redis: { get: jest.Mock; set: jest.Mock };

  beforeEach(async () => {
    redis = { get: jest.fn(), set: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        {
          provide: PrismaService,
          useValue: {
            platformConfig: {
              findUniqueOrThrow: jest.fn().mockResolvedValue({
                serviceFeeRate: new Decimal('0.12'),
                taxRate: new Decimal('0.20'),
                hostApprovalWindowHours: 24,
              }),
            },
          },
        },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get(PricingService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('calculate', () => {
    it('uses Redis cache when available', async () => {
      redis.get.mockResolvedValue(mockPlatformConfig);

      const result = await service.calculate(baseListing, 3);

      expect(redis.set).not.toHaveBeenCalled();
      expect(result.unitCount).toBe(3);
    });

    it('falls back to DB when cache is empty and populates cache', async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockResolvedValue(undefined);

      await service.calculate(baseListing, 2);

      expect(redis.set).toHaveBeenCalledWith(
        'platform:config',
        expect.objectContaining({ serviceFeeRate: '0.12' }),
        300,
      );
    });

    it('computes correct total: 2 nights, €100/night + €20 cleaning, 12% fee, 20% tax', async () => {
      redis.get.mockResolvedValue(mockPlatformConfig);
      // baseAmount = 100 × 2 = 200
      // cleaningFee = 20
      // serviceFee = (200 + 20) × 0.12 = 26.40
      // taxAmount  = (200 + 20 + 26.40) × 0.20 = 49.28
      // total      = 200 + 20 + 26.40 + 49.28 = 295.68

      const result = await service.calculate(baseListing, 2);

      expect(result.baseAmount.toFixed(2)).toBe('200.00');
      expect(result.cleaningFee.toFixed(2)).toBe('20.00');
      expect(result.serviceFee.toFixed(2)).toBe('26.40');
      expect(result.taxAmount.toFixed(2)).toBe('49.28');
      expect(result.totalAmount.toFixed(2)).toBe('295.68');
    });

    it('computes correct total without cleaning fee', async () => {
      redis.get.mockResolvedValue(mockPlatformConfig);
      const listingNoCleaning: Listing = { ...baseListing, cleaningFee: null };
      // baseAmount = 100 × 1 = 100
      // cleaningFee = 0
      // serviceFee = 100 × 0.12 = 12
      // taxAmount  = 112 × 0.20 = 22.40
      // total      = 134.40

      const result = await service.calculate(listingNoCleaning, 1);

      expect(result.cleaningFee.toFixed(2)).toBe('0.00');
      expect(result.totalAmount.toFixed(2)).toBe('134.40');
    });

    it('applies listing serviceFeeRateOverride over platform rate', async () => {
      redis.get.mockResolvedValue(mockPlatformConfig);
      const listing: Listing = {
        ...baseListing,
        cleaningFee: null,
        serviceFeeRateOverride: makeDecimal('0.05'), // 5% instead of 12%
      };
      // baseAmount = 100, serviceFee = 5, taxAmount = 105×0.20 = 21, total = 126

      const result = await service.calculate(listing, 1);

      expect(result.effectiveServiceFeeRate.toFixed(2)).toBe('0.05');
      expect(result.serviceFee.toFixed(2)).toBe('5.00');
      expect(result.totalAmount.toFixed(2)).toBe('126.00');
    });
  });
});
