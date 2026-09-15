import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import type { Listing, CancellationPolicy } from '@prisma/client';
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

  /**
   * Taux de remboursement (0 à 1) selon la politique d'annulation et le délai
   * restant avant le début du séjour — voir CANCELLATION_DETAIL côté front et
   * CANCELLATION_POLICIES dans le design de référence, seule source faisant foi
   * (le commentaire de l'enum Prisma est obsolète et ne doit pas être suivi).
   */
  refundRate(policy: CancellationPolicy, hoursUntilStart: number): number {
    switch (policy) {
      case 'FLEXIBLE':
        return hoursUntilStart >= 24 ? 1 : 0;
      case 'MODERATE':
        return hoursUntilStart >= 72 ? 1 : hoursUntilStart >= 24 ? 0.5 : 0;
      case 'STRICT':
        return hoursUntilStart >= 168 ? 0.5 : 0;
      case 'NON_REFUNDABLE':
        return 0;
    }
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
