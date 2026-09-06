import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Flags de fonctionnalités — permettent de simuler certaines briques externes
 * (paiement Stripe…) pour dérouler tous les parcours utilisateurs en démo/dev.
 *
 * Ajouter un flag = ajouter sa clé ici + un défaut dans `DEFAULTS`.
 */
export const FEATURE_KEYS = ['simulatePayments'] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type FeatureFlags = Record<FeatureKey, boolean>;

const DEFAULTS: FeatureFlags = {
  simulatePayments: false,
};

@Injectable()
export class FeaturesService {
  private readonly logger = new Logger(FeaturesService.name);
  private readonly flags: FeatureFlags;

  constructor(config: ConfigService) {
    const initial = config.get<string[]>('features.initial') ?? [];
    this.flags = { ...DEFAULTS };
    for (const key of FEATURE_KEYS) {
      if (initial.includes(key)) this.flags[key] = true;
    }
    if (initial.length > 0) {
      this.logger.log(`Flags actifs au démarrage : ${initial.join(', ')}`);
    }
  }

  all(): FeatureFlags {
    return { ...this.flags };
  }

  isOn(key: FeatureKey): boolean {
    return this.flags[key] === true;
  }

  /** Modifie les flags à chaud (utilisé par PATCH /features, gardé en mémoire). */
  set(patch: Partial<FeatureFlags>): FeatureFlags {
    for (const key of FEATURE_KEYS) {
      if (typeof patch[key] === 'boolean') {
        this.flags[key] = patch[key] as boolean;
        this.logger.log(`Flag ${key} → ${this.flags[key]}`);
      }
    }
    return this.all();
  }
}
