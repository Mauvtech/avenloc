'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, type ConnectStatus } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/ui';
import { computeHostStats, fmtEUR, fmtEUR2 } from '@/lib/host-stats';
import { useHostGuard } from './use-host-guard';
import type { Booking } from '@/lib/types';

export default function HostDashboardPage() {
  const { ready } = useHostGuard();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [connectChecked, setConnectChecked] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      api.bookings.asHost().catch(() => [] as Booking[]),
      api.payments.connectStatus().catch(() => null),
    ])
      .then(([bs, cs]) => {
        setBookings(bs);
        setConnect(cs);
        setConnectChecked(true);
      })
      .finally(() => setLoading(false));
  }, [ready]);

  async function startOnboarding() {
    setOnboarding(true);
    setError(null);
    try {
      const { url } = await api.payments.onboard();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de démarrer la configuration.');
      setOnboarding(false);
    }
  }

  const stats = useMemo(() => computeHostStats(bookings), [bookings]);

  if (!ready || loading) return <PageLoader />;

  const active = connect?.connected && connect.status === 'active';
  const connectPending = connect?.connected && connect.status !== 'active';

  return (
    <div className="space-y-8">
      <PageHeader title="Tableau de bord" />

      {/* Encaissements Stripe */}
      {connectChecked &&
        (active ? (
          <div className="rounded-lg border border-success/30 bg-success-tint p-3 text-sm text-success-fg">
            <span className="font-semibold">✓ Encaissements activés</span>
            {connect?.last4 && (
              <span>
                {' '}— IBAN •••• <span className="font-mono font-semibold">{connect.last4}</span>
                {connect.holderName ? ` · ${connect.holderName}` : ''}
              </span>
            )}
            <button onClick={startOnboarding} disabled={onboarding} className="ml-2 font-semibold underline">
              Gérer
            </button>
          </div>
        ) : (
          <div className="card space-y-3 p-4">
            <div className="text-sm font-bold">Configurez vos encaissements</div>
            <p className="text-sm text-muted">
              {connectPending
                ? 'Stripe vérifie encore vos informations.'
                : 'Obligatoire avant de recevoir des réservations. Identité + IBAN saisis sur une page Stripe.'}
            </p>
            <button onClick={startOnboarding} disabled={onboarding} className="btn-primary">
              {onboarding
                ? 'Redirection…'
                : connectPending
                  ? 'Reprendre la configuration'
                  : 'Configurer mes encaissements'}
            </button>
          </div>
        ))}

      {error && <p className="text-sm text-danger-fg">{error}</p>}

      {/* KPIs */}
      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Revenus nets" value={fmtEUR(stats.revenueNet)} hint="Confirmées + terminées" />
          <Kpi label="Ce mois-ci" value={fmtEUR(stats.revenueMonth)} hint="Créneaux démarrant ce mois" />
          <Kpi
            label="À venir"
            value={fmtEUR(stats.upcomingRevenue)}
            hint={`${stats.nightsUpcoming} réservation(s) à venir`}
          />
          <Kpi label="Panier moyen" value={stats.avgBasket ? fmtEUR(stats.avgBasket) : '—'} hint="Par réservation" />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>{stats.counts.total} réservation(s)</span>
          <span>· {stats.counts.pending} en attente</span>
          <span>· {stats.counts.confirmed} confirmée(s)</span>
          <span>· {stats.counts.completed} terminée(s)</span>
          <span>· {stats.counts.cancelled} annulée(s)</span>
          {stats.confirmationRate !== null && (
            <span>· {Math.round(stats.confirmationRate * 100)}% de confirmation</span>
          )}
          <span>· commission Aven : {fmtEUR2(stats.platformFees)}</span>
        </div>
      </section>
    </div>
  );
}

// Reprend StatCard du prototype : bordure fine, radius 12, aucune ombre ni accent coloré.
function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="mt-1.5 text-[22px] font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
