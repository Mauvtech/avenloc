import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';

/**
 * Flags de fonctionnalités — permettent de cacher aux utilisateurs des briques
 * pas encore prêtes pour la production (ex. le vrai paiement Stripe, encore en
 * simulation) ou de dérouler tous les parcours en démo/dev.
 *
 * Ajouter un flag = ajouter sa clé ici + un défaut dans `DEFAULTS`.
 *
 * Persistant en base (`FeatureFlagState`, singleton) : seul un compte ADMIN
 * peut les modifier (voir FeaturesController), et la valeur survit aux
 * redémarrages/redéploiements — contrairement à l'ancien flag `FEATURES_ADMIN`
 * qui n'importe quel visiteur pouvait actionner hors production.
 */
export const FEATURE_KEYS = ['simulatePayments'] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type FeatureFlags = Record<FeatureKey, boolean>;

// simulatePayments à true par défaut : le vrai Stripe n'est pas encore prêt
// pour de vrais utilisateurs (onboarding Connect, cartes réelles...) — tant
// qu'un admin ne l'active pas explicitement, tout le monde reste en simulation.
const DEFAULTS: FeatureFlags = {
  simulatePayments: true,
};

@Injectable()
export class FeaturesService implements OnModuleInit {
  private readonly logger = new Logger(FeaturesService.name);
  private flags: FeatureFlags = { ...DEFAULTS };

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const initial = this.config.get<string[]>('features.initial') ?? [];
    const bootDefaults: FeatureFlags = { ...DEFAULTS };
    for (const key of FEATURE_KEYS) {
      if (initial.includes(key)) bootDefaults[key] = true;
    }

    // upsert plutôt que findUnique+create : sûr si deux instances démarrent en même temps.
    const row = await this.prisma.featureFlagState.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', flags: bootDefaults as Prisma.InputJsonValue },
    });

    this.flags = { ...DEFAULTS, ...(row.flags as Partial<FeatureFlags>) };
    this.logger.log(`Flags chargés : ${JSON.stringify(this.flags)}`);
  }

  all(): FeatureFlags {
    return { ...this.flags };
  }

  isOn(key: FeatureKey): boolean {
    return this.flags[key] === true;
  }

  /** Modifie les flags (PATCH /features, réservé à un compte ADMIN) et les persiste. */
  async set(patch: Partial<FeatureFlags>): Promise<FeatureFlags> {
    for (const key of FEATURE_KEYS) {
      if (typeof patch[key] === 'boolean') {
        this.flags[key] = patch[key] as boolean;
        this.logger.log(`Flag ${key} → ${this.flags[key]}`);
      }
    }
    await this.prisma.featureFlagState.update({
      where: { id: 'default' },
      data: { flags: this.flags as Prisma.InputJsonValue },
    });
    return this.all();
  }
}
