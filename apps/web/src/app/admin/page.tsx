'use client';

import { useEffect, useState } from 'react';
import { api, type FeatureFlags } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/ui';
import { useToast } from '@/components/toast';
import { LISTING_TYPES, typeLabel } from '@/lib/listing';
import { useAdminGuard } from './use-admin-guard';

type BooleanFlagKey = 'simulatePayments';

const FLAG_META: Record<BooleanFlagKey, { label: string; description: string }> = {
  simulatePayments: {
    label: 'Simuler les paiements (masquer Stripe)',
    description:
      "Tant que ce flag est activé, aucun utilisateur ne voit d'écran Stripe réel : l'onboarding hôte s'active instantanément et les paiements sont simulés. À désactiver seulement quand l'intégration Stripe réelle sera prête pour de vrais utilisateurs.",
  },
};

const BOOLEAN_FLAG_KEYS = Object.keys(FLAG_META) as BooleanFlagKey[];

export default function AdminPage() {
  const { ready } = useAdminGuard();
  const toast = useToast();
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [savingTypes, setSavingTypes] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api.features
      .get()
      .then((r) => setFlags(r.flags))
      .finally(() => setLoading(false));
  }, [ready]);

  async function toggle(key: BooleanFlagKey) {
    if (!flags) return;
    setBusyKey(key);
    try {
      const r = await api.features.set({ [key]: !flags[key] } as Partial<FeatureFlags>);
      setFlags(r.flags);
      toast.success(`« ${FLAG_META[key].label} » ${r.flags[key] ? 'activé' : 'désactivé'}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setBusyKey(null);
    }
  }

  async function toggleType(type: string) {
    if (!flags) return;
    const current = flags.enabledListingTypes;
    const next = current.includes(type) ? current.filter((t) => t !== type) : [...current, type];
    if (next.length === 0) {
      toast.error('Au moins un type doit rester actif.');
      return;
    }
    setSavingTypes(true);
    try {
      const r = await api.features.set({ enabledListingTypes: next });
      setFlags(r.flags);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setSavingTypes(false);
    }
  }

  if (!ready || loading || !flags) return <PageLoader />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Administration"
        subtitle="Réservé aux comptes ADMIN — ces réglages s'appliquent immédiatement à tous les utilisateurs."
      />

      <section className="space-y-3">
        <h2 className="section-title">Fonctionnalités</h2>
        <div className="space-y-2.5">
          {BOOLEAN_FLAG_KEYS.map((key) => (
            <div key={key} className="card flex items-start justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">{FLAG_META[key].label}</p>
                <p className="mt-1 text-xs text-muted">{FLAG_META[key].description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={flags[key]}
                disabled={busyKey === key}
                onClick={() => toggle(key)}
                className={`relative flex-none h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                  flags[key] ? 'bg-ink' : 'bg-line'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    flags[key] ? 'translate-x-[22px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="section-title">Types d&apos;espaces proposés</h2>
        <p className="text-xs text-muted">
          Types sélectionnables à la création d&apos;une annonce et dans les filtres de recherche.
          Décoché, un type reste consultable pour les annonces déjà publiées mais ne peut plus être
          choisi pour une nouvelle annonce.
        </p>
        <div className="card divide-y divide-line p-0">
          {LISTING_TYPES.map((type) => {
            const enabled = flags.enabledListingTypes.includes(type);
            return (
              <label
                key={type}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm first:rounded-t-[inherit] last:rounded-b-[inherit] hover:bg-canvas"
              >
                <span className={enabled ? 'font-medium text-ink' : 'text-muted'}>{typeLabel(type)}</span>
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={savingTypes}
                  onChange={() => toggleType(type)}
                  className="h-4 w-4"
                />
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
