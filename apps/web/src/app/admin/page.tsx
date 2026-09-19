'use client';

import { useEffect, useState } from 'react';
import { api, type FeatureFlags } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/ui';
import { useToast } from '@/components/toast';
import { useAdminGuard } from './use-admin-guard';

const FLAG_META: Record<keyof FeatureFlags, { label: string; description: string }> = {
  simulatePayments: {
    label: 'Simuler les paiements (masquer Stripe)',
    description:
      "Tant que ce flag est activé, aucun utilisateur ne voit d'écran Stripe réel : l'onboarding hôte s'active instantanément et les paiements sont simulés. À désactiver seulement quand l'intégration Stripe réelle sera prête pour de vrais utilisateurs.",
  },
};

export default function AdminPage() {
  const { ready } = useAdminGuard();
  const toast = useToast();
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    api.features
      .get()
      .then((r) => setFlags(r.flags))
      .finally(() => setLoading(false));
  }, [ready]);

  async function toggle(key: keyof FeatureFlags) {
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
          {(Object.keys(flags) as (keyof FeatureFlags)[]).map((key) => (
            <div key={key} className="card flex items-start justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">{FLAG_META[key]?.label ?? key}</p>
                <p className="mt-1 text-xs text-muted">{FLAG_META[key]?.description}</p>
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
    </div>
  );
}
