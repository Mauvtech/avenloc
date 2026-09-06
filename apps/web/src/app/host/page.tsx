'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api, type ConnectStatus } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import CategoryIcon from '@/components/category-icon';
import { EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { useConfirm } from '@/components/confirm';
import { useToast } from '@/components/toast';
import { eurRound } from '@/lib/format';
import {
  LISTING_STATUS_CLASS,
  LISTING_STATUS_LABEL,
  typeLabel,
  UNIT_LABEL_SHORT,
} from '@/lib/listing';
import { computeHostStats, fmtEUR, fmtEUR2, netAmount } from '@/lib/host-stats';
import type { Booking, Listing } from '@/lib/types';

const BK_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'En attente', cls: 'bg-warn-tint text-warn-fg' },
  CONFIRMED: { label: 'Confirmée', cls: 'bg-success-tint text-success-fg' },
  COMPLETED: { label: 'Terminée', cls: 'bg-canvas text-muted' },
  CANCELLED: { label: 'Annulée', cls: 'bg-danger-tint text-danger-fg' },
};

type BookingTab = 'pending' | 'upcoming' | 'past' | 'cancelled' | 'all';

const fdate = (s: string) => new Date(s).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

export default function HostDashboardPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HostDashboard />
    </Suspense>
  );
}

function HostDashboard() {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const searchParams = useSearchParams();
  const createdId = searchParams.get('created');
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [connectChecked, setConnectChecked] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<BookingTab>('pending');

  const load = useCallback(async () => {
    const [ls, bs, cs] = await Promise.all([
      api.listings.mine().catch(() => [] as Listing[]),
      api.bookings.asHost().catch(() => [] as Booking[]),
      api.payments.connectStatus().catch(() => null),
    ]);
    setListings(ls);
    setBookings(bs);
    setConnect(cs);
    setConnectChecked(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    api.auth
      .me()
      .then((me) => {
        if (!me.roles.includes('HOST')) {
          router.replace('/profile');
          return;
        }
        return load();
      })
      .catch(() => router.replace('/auth/login'))
      .finally(() => setLoading(false));
  }, [router, load]);

  // Après création d'une annonce : met en avant la ligne concernée.
  useEffect(() => {
    if (!createdId || listings.length === 0) return;
    const el = document.getElementById(`listing-${createdId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.info('Annonce en brouillon — publiez-la pour la rendre visible');
    }
    // Nettoie le paramètre pour ne pas re-déclencher.
    router.replace('/host');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdId, listings.length]);

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

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusyId(id);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setBusyId(null);
    }
  }

  const stats = useMemo(() => computeHostStats(bookings), [bookings]);

  const todayTs = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const revenueByListing = useMemo(() => {
    const m = new Map<string, { count: number; net: number }>();
    for (const b of bookings) {
      if (b.status !== 'CONFIRMED' && b.status !== 'COMPLETED') continue;
      const cur = m.get(b.listingId) ?? { count: 0, net: 0 };
      cur.count++;
      cur.net += netAmount(b);
      m.set(b.listingId, cur);
    }
    return m;
  }, [bookings]);

  const filtered = useMemo(() => {
    const byTab = (b: Booking) => {
      const endTs = new Date(b.endDate).getTime();
      switch (tab) {
        case 'pending':
          return b.status === 'PENDING';
        case 'upcoming':
          return b.status === 'CONFIRMED' && endTs >= todayTs;
        case 'past':
          return b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && endTs < todayTs);
        case 'cancelled':
          return b.status === 'CANCELLED';
        default:
          return true;
      }
    };
    return bookings
      .filter(byTab)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [bookings, tab, todayTs]);

  const tabCounts = useMemo(
    () => ({
      pending: bookings.filter((b) => b.status === 'PENDING').length,
      upcoming: bookings.filter(
        (b) => b.status === 'CONFIRMED' && new Date(b.endDate).getTime() >= todayTs,
      ).length,
      past: bookings.filter(
        (b) =>
          b.status === 'COMPLETED' ||
          (b.status === 'CONFIRMED' && new Date(b.endDate).getTime() < todayTs),
      ).length,
      cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
      all: bookings.length,
    }),
    [bookings, todayTs],
  );

  if (loading) return <PageLoader />;

  const active = connect?.connected && connect.status === 'active';
  const connectPending = connect?.connected && connect.status !== 'active';

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        title="Tableau de bord"
        action={
          <Link href="/listings/new" className="btn-primary">
            + Créer une annonce
          </Link>
        }
      />

      {/* Versements Stripe */}
      {connectChecked &&
        (active ? (
          <div className="rounded-lg border border-success/30 bg-success-tint p-3 text-sm text-success-fg">
            <span className="font-semibold">✓ Versements activés</span>
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
            <div className="text-sm font-bold">Configurez vos versements</div>
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
                  : 'Configurer mes versements'}
            </button>
          </div>
        ))}

      {/* ── KPIs ─────────────────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Revenus nets" value={fmtEUR(stats.revenueNet)} hint="Confirmées + terminées" />
          <Kpi label="Ce mois-ci" value={fmtEUR(stats.revenueMonth)} hint="Séjours démarrant ce mois" />
          <Kpi
            label="À venir"
            value={fmtEUR(stats.upcomingRevenue)}
            hint={`${stats.nightsUpcoming} nuit(s) réservée(s)`}
            accent={stats.upcomingRevenue > 0}
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

      {error && <p className="text-sm text-danger-fg">{error}</p>}

      {/* ── Réservations ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold">Réservations</h2>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['pending', 'En attente'],
              ['upcoming', 'À venir'],
              ['past', 'Passées'],
              ['cancelled', 'Annulées'],
              ['all', 'Toutes'],
            ] as [BookingTab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                tab === key
                  ? 'border-brand bg-brand text-white'
                  : 'border-line bg-surface text-muted hover:text-ink'
              }`}
            >
              {label}
              <span className={tab === key ? 'text-white/80' : 'text-muted'}> · {tabCounts[key]}</span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="card p-8 text-center text-sm text-muted">
            Aucune réservation dans cette catégorie.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((b) => {
              const isBusy = busyId === b.id;
              const endPassed = new Date(b.endDate).getTime() < todayTs;
              return (
                <div key={b.id} className="card space-y-3 p-3.5">
                  <div className="flex items-start gap-3">
                    <CategoryIcon
                      type={b.listing?.type ?? 'OTHER'}
                      size={20}
                      className="mt-0.5 flex-none text-brand-fg"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">{b.listing?.title ?? 'Annonce'}</div>
                      <div className="text-xs text-muted">
                        {b.tenant ? `${b.tenant.firstName} ${b.tenant.lastName}` : 'Locataire'} ·{' '}
                        {fdate(b.startDate)} → {fdate(b.endDate)} · {b.guestCount} pers.
                        {b.arrivalTime ? ` · arrivée ${b.arrivalTime}` : ''}
                      </div>
                      {b.guestNote && (
                        <div className="mt-0.5 text-xs italic text-muted">« {b.guestNote} »</div>
                      )}
                    </div>
                    <div className="flex-none text-right">
                      <div className="text-sm font-extrabold">{fmtEUR2(netAmount(b))}</div>
                      <div className="text-[10px] text-muted">net</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        BK_STATUS[b.status]?.cls ?? 'bg-canvas text-muted'
                      }`}
                    >
                      {BK_STATUS[b.status]?.label ?? b.status}
                    </span>
                    <span className="flex-1" />
                    {b.status === 'PENDING' && (
                      <>
                        <button
                          disabled={isBusy}
                          onClick={() => run(b.id, () => api.bookings.reject(b.id))}
                          className="btn-ghost px-3 py-2 text-[13px]"
                        >
                          Refuser
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={() => run(b.id, () => api.bookings.approve(b.id))}
                          className="btn-primary px-3 py-2 text-[13px]"
                        >
                          Accepter
                        </button>
                      </>
                    )}
                    {b.status === 'CONFIRMED' && (
                      <>
                        <Link href="/conversations" className="btn-ghost px-3 py-2 text-[13px]">
                          Message
                        </Link>
                        {endPassed && (
                          <button
                            disabled={isBusy}
                            onClick={() => run(b.id, () => api.bookings.complete(b.id))}
                            className="btn-primary px-3 py-2 text-[13px]"
                          >
                            Marquer terminée
                          </button>
                        )}
                      </>
                    )}
                    {b.status === 'COMPLETED' && (
                      <Link href="/conversations" className="btn-ghost px-3 py-2 text-[13px]">
                        Message
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Annonces ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold">
          Mes annonces{' '}
          <span className="font-normal text-muted">
            · {listings.filter((l) => l.status === 'PUBLISHED').length} publiée(s) / {listings.length}
          </span>
        </h2>
        {listings.length === 0 ? (
          <EmptyState
            icon="🏠"
            title="Aucune annonce"
            action={
              <Link href="/listings/new" className="btn-primary">
                Créer la première
              </Link>
            }
          >
            Publiez votre premier espace pour commencer à recevoir des réservations.
          </EmptyState>
        ) : (
          <div className="space-y-2.5">
            {listings.map((l) => {
              const isBusy = busyId === l.id;
              const rev = revenueByListing.get(l.id);
              return (
                <div
                  key={l.id}
                  id={`listing-${l.id}`}
                  className={`card space-y-3 p-3.5 transition-shadow ${
                    createdId === l.id ? 'ring-2 ring-brand' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CategoryIcon type={l.type} size={20} className="mt-0.5 flex-none text-brand-fg" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold">{l.title}</div>
                      <div className="text-xs text-muted">
                        {typeLabel(l.type)}
                        {rev ? ` · ${rev.count} résa · ${fmtEUR(rev.net)}` : ' · aucune réservation'}
                      </div>
                    </div>
                    <div className="flex-none text-right text-sm font-semibold">
                      {eurRound(l.basePrice)}
                      <span className="font-normal text-muted">
                        /{UNIT_LABEL_SHORT[l.pricingUnit] ?? ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        LISTING_STATUS_CLASS[l.status] ?? 'bg-canvas text-muted'
                      }`}
                    >
                      {LISTING_STATUS_LABEL[l.status] ?? l.status}
                    </span>
                    <span className="flex-1" />
                    <Link href={`/listings/${l.id}`} className="btn-ghost px-3 py-2 text-[13px]">
                      Voir
                    </Link>
                    <Link href={`/listings/${l.id}/edit`} className="btn-ghost px-3 py-2 text-[13px]">
                      Modifier
                    </Link>
                    <Link href={`/listings/${l.id}/calendar`} className="btn-ghost px-3 py-2 text-[13px]">
                      Calendrier
                    </Link>
                    {l.status === 'DRAFT' && (
                      <button
                        disabled={isBusy}
                        onClick={() => run(l.id, () => api.listings.setStatus(l.id, 'PUBLISHED'))}
                        className="btn-primary px-3 py-2 text-[13px]"
                      >
                        Publier
                      </button>
                    )}
                    {l.status === 'PUBLISHED' && (
                      <button
                        disabled={isBusy}
                        onClick={() => run(l.id, () => api.listings.setStatus(l.id, 'DRAFT'))}
                        className="btn-ghost px-3 py-2 text-[13px]"
                      >
                        Dépublier
                      </button>
                    )}
                    {l.status !== 'ARCHIVED' && (
                      <button
                        disabled={isBusy}
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Archiver cette annonce ?',
                            body: 'Elle ne sera plus visible ni réservable. Les réservations en cours ne sont pas affectées.',
                            confirmLabel: 'Archiver',
                            danger: true,
                          });
                          if (ok) run(l.id, () => api.listings.archive(l.id));
                        }}
                        className="rounded px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:text-danger-fg"
                      >
                        Archiver
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        accent ? 'border-brand bg-brand-tint/50' : 'border-line bg-surface shadow-card'
      }`}
    >
      <div className={`text-xs ${accent ? 'font-semibold text-brand-fg' : 'text-muted'}`}>{label}</div>
      <div className="mt-0.5 text-2xl font-extrabold tracking-tight">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
    </div>
  );
}
