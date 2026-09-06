import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import type { Listing } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { RedisService } from '@/infrastructure/cache/redis.service';

const PLATFORM_CONFIG_CACHE_KEY = 'platform:config';
const PLATFORM_CONFIG_CACHE_TTL = 300;

interface CachedPlatformConfig {
  serviceFeeRate: string;
  taxRate: string;
  hostApprovalWindowHours: number;
}

export interface PriceBreakdown {
  unitCount: number;
  baseAmount: Decimal;
  cleaningFee: Decimal;
  serviceFee: Decimal;
  taxAmount: Decimal;
  totalAmount: Decimal;
  effectiveServiceFeeRate: Decimal;
}

@Injectable()
export class PricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async calculate(listing: Listing, unitCount: number): Promise<PriceBreakdown> {
    const config = await this.getPlatformConfig();

    const effectiveServiceFeeRate = listing.serviceFeeRateOverride
      ? new Decimal(listing.serviceFeeRateOverride.toString())
      : new Decimal(config.serviceFeeRate);

    const taxRate = new Decimal(config.taxRate);
    const basePrice = new Decimal(listing.basePrice.toString());
    const cleaningFee = listing.cleaningFee
      ? new Decimal(listing.cleaningFee.toString())
      : new Decimal(0);

    const baseAmount = basePrice.mul(unitCount);
    const serviceFee = baseAmount.add(cleaningFee).mul(effectiveServiceFeeRate);
    const taxAmount = baseAmount.add(cleaningFee).add(serviceFee).mul(taxRate);
    const totalAmount = baseAmount.add(cleaningFee).add(serviceFee).add(taxAmount);

    return {
      unitCount,
      baseAmount,
      cleaningFee,
      serviceFee,
      taxAmount,
      totalAmount,
      effectiveServiceFeeRate,
    };
  }

  async getHostApprovalWindowHours(): Promise<number> {
    const config = await this.getPlatformConfig();
    return config.hostApprovalWindowHours;
  }

  private async getPlatformConfig(): Promise<CachedPlatformConfig> {
    const cached = await this.redis.get<CachedPlatformConfig>(PLATFORM_CONFIG_CACHE_KEY);
    if (cached) return cached;

    const config = await this.prisma.platformConfig.findUniqueOrThrow({
      where: { id: 'default' },
    });

    const cacheable: CachedPlatformConfig = {
      serviceFeeRate: config.serviceFeeRate.toString(),
      taxRate: config.taxRate.toString(),
      hostApprovalWindowHours: config.hostApprovalWindowHours,
    };

    await this.redis.set(PLATFORM_CONFIG_CACHE_KEY, cacheable, PLATFORM_CONFIG_CACHE_TTL);
    return cacheable;
  }
}
