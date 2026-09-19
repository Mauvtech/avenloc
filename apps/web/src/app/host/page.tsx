'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, type ConnectStatus } from '@/lib/api';
import { PageHeader, PageLoader } from '@/components/ui';
import { computeHostStats, fmtEUR, fmtEUR2 } from '@/lib/host-stats';
import { useHostGuard } from './use-host-guard';
import type { Booking, Listing } from '@/lib/types';

export default function HostDashboardPage() {
  const { ready } = useHostGuard();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [spaces, setSpaces] = useState<Listing[]>([]);
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
      api.listings.mine().catch(() => [] as Listing[]),
    ])
      .then(([bs, cs, ls]) => {
        setSpaces(ls);
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

  const now = new Date();
  const today = bookings.filter((b) => b.status !== 'CANCELLED' && new Date(b.startAt).toDateString() === now.toDateString());
  const occupied = new Set(bookings.filter((b) => b.status === 'CONFIRMED' && new Date(b.startAt) <= now && new Date(b.endAt) > now).map((b) => b.listingId)).size;
  const nextArrival = today.filter((b) => b.status === 'CONFIRMED' && new Date(b.startAt) > now).sort((a,b) => a.startAt.localeCompare(b.startAt))[0];
  const monthCount = bookings.filter((b) => b.status !== 'CANCELLED' && new Date(b.startAt).getMonth() === now.getMonth() && new Date(b.startAt).getFullYear() === now.getFullYear()).length;
  const firstSpace = spaces.find((s) => s.status === 'PUBLISHED') ?? spaces[0];
  const active = connect?.connected && connect.status === 'active';
  const connectPending = connect?.connected && connect.status !== 'active';

  return (
    <div className="space-y-8">
      <PageHeader title="Bonjour 👋" />
      <section>
        <h2 className="section-title mb-3">Aujourd’hui</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Kpi label="Réservations" value={String(today.length)} />
          <Kpi label="Espaces occupés" value={`${occupied} / ${spaces.filter((s) => s.status === 'PUBLISHED').length}`} />
          <Kpi label="Prochaine arrivée" value={nextArrival ? new Date(nextArrival.startAt).toLocaleTimeString('fr-FR', {hour:'2-digit',minute:'2-digit'}) : '—'} hint={nextArrival?.listing?.title} />
        </div>
      </section>
      <section>
        <h2 className="section-title mb-3">Ce mois-ci</h2>
        <div className="grid grid-cols-2 gap-4"><Kpi label="Revenu net" value={fmtEUR(stats.revenueMonth)} /><Kpi label="Réservations" value={String(monthCount)} /></div>
      </section>
      <div className="grid gap-8 min-[901px]:grid-cols-2">
        <section><h2 className="section-title mb-3">Actions</h2><div className="flex flex-wrap gap-3">
          <Link className="btn-ghost text-[13px] font-normal" href={firstSpace ? `/listings/${firstSpace.id}/calendar` : '/host/spaces'}>Modifier disponibilité</Link>
          <Link className="btn-ghost text-[13px] font-normal" href={firstSpace ? `/listings/${firstSpace.id}/edit` : '/host/spaces'}>Modifier prix</Link>
          <Link className="btn-ghost text-[13px] font-normal" href="/host/spaces">Modifier un espace</Link>
          <Link className="btn-ghost text-[13px] font-normal" href="/host/reservations">Voir les réservations</Link>
        </div></section>
        <section><h2 className="section-title mb-3">Réservations récentes</h2><div className="card divide-y divide-line">
          {bookings.length ? [...bookings].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,4).map((b) => <Link key={b.id} href="/host/reservations" className="block px-4 py-3 hover:bg-canvas"><p className="text-[13px]">{b.listing?.title ?? 'Réservation'} — {fmtEUR(b.totalAmount)}</p><p className="mt-1 text-xs text-muted">{new Date(b.startAt).toLocaleDateString('fr-FR')}</p></Link>) : <p className="px-4 py-3 text-[13px] text-muted">Aucune réservation pour le moment.</p>}
        </div></section>
      </div>

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
    <div className="rounded-lg border border-line bg-surface p-[18px]">
      <div className="text-[13px] text-muted">{label}</div>
      <div className="mt-1.5 text-[22px] font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
