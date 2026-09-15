'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { api, type ConnectStatus } from '@/lib/api';
import { isAuthenticated, loginHref } from '@/lib/auth';
import CategoryIcon from '@/components/category-icon';
import { EmptyState, PageLoader, VerifiedBadge } from '@/components/ui';
import { useConfirm } from '@/components/confirm';
import { useToast } from '@/components/toast';
import { dateShort, eurRound, timeAgo, timeShort } from '@/lib/format';
import { typeLabel, UNIT_LABEL_SHORT } from '@/lib/listing';
import { computeHostStats, fmtEUR, fmtEUR2, netAmount } from '@/lib/host-stats';
import HostCalendar from '@/components/host/host-calendar';
import HostReviews from '@/components/host/host-reviews';
import HostFinances from '@/components/host/host-finances';
import ConversationsPanel from '@/components/conversations-panel';
import DepositCard from '@/components/deposit-card';
import type { Booking, Listing, Review } from '@/lib/types';

const BK_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'En attente', cls: 'bg-warn-tint text-warn-fg' },
  CONFIRMED: { label: 'Confirmée', cls: 'bg-success-tint text-success-fg' },
  COMPLETED: { label: 'Terminée', cls: 'bg-canvas text-muted' },
  CANCELLED: { label: 'Annulée', cls: 'bg-danger-tint text-danger-fg' },
};

const PAYMENT_LABEL: Record<string, string> = {
  PENDING: 'en attente',
  CAPTURED: 'payé',
  REFUNDED: 'remboursé',
  PARTIALLY_REFUNDED: 'partiellement remboursé',
  FAILED: 'échoué',
};

// Pastille de statut du tableau Réservations — voir StatusPill dans le design
// de référence (couleurs propres au tableau, distinctes des badges des cartes).
const TABLE_STATUS_PILL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'en attente', cls: 'bg-warn-tint text-warn-fg' },
  CONFIRMED: { label: 'confirmée', cls: 'bg-brand-tint text-brand-fg' },
  COMPLETED: { label: 'terminée', cls: 'bg-canvas text-muted' },
  CANCELLED: { label: 'annulée', cls: 'bg-danger-tint text-danger-fg' },
};

type BookingTab = 'upcoming' | 'ongoing' | 'past';
const BOOKING_TAB_EMPTY_LABEL: Record<BookingTab, string> = {
  upcoming: 'à venir',
  ongoing: 'en cours',
  past: 'passée',
};
type HostTab = 'Tableau de bord' | 'Établissements & espaces' | 'Réservations' | 'Avis' | 'Messagerie' | 'Finances';
const HOST_TAB_TITLE: Record<HostTab, string> = {
  'Tableau de bord': 'Bonjour 👋',
  'Établissements & espaces': 'Établissements & espaces',
  Réservations: 'Réservations',
  Avis: 'Avis',
  Messagerie: 'Messagerie',
  Finances: 'Finances',
};
const HOST_TABS: HostTab[] = [
  'Tableau de bord',
  'Établissements & espaces',
  'Réservations',
  'Avis',
  'Messagerie',
  'Finances',
];

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
  const pathname = usePathname();
  const confirm = useConfirm();
  const toast = useToast();
  const searchParams = useSearchParams();
  const createdId = searchParams.get('created');
  const [tab, setTab] = useState<HostTab>('Tableau de bord');
  const [listings, setListings] = useState<Listing[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [connectChecked, setConnectChecked] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [bookingTab, setBookingTab] = useState<BookingTab>('upcoming');
  const [hostVerified, setHostVerified] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [recentReviews, setRecentReviews] = useState<(Review & { listingTitle: string })[]>([]);

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

    const perListing = await Promise.all(
      ls.map((l) =>
        api.reviews
          .byListing(l.id)
          .then((r) => r.reviews.map((rev) => ({ ...rev, listingTitle: l.title })))
          .catch(() => []),
      ),
    );
    setRecentReviews(perListing.flat());
  }, []);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(loginHref(pathname));
      return;
    }
    api.auth
      .me()
      .then((me) => {
        if (!me.roles.includes('HOST')) {
          router.replace('/profile');
          return;
        }
        setHostVerified(me.identityStatus === 'VERIFIED');
        return load();
      })
      .catch(() => router.replace(loginHref(pathname)))
      .finally(() => setLoading(false));
  }, [router, load, pathname]);

  // Après création d'une annonce : bascule sur l'onglet Établissements et met en avant la ligne concernée.
  useEffect(() => {
    if (!createdId || listings.length === 0) return;
    setTab('Établissements & espaces');
    const el = document.getElementById(`listing-${createdId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.info('Annonce en brouillon — publiez-la pour la rendre visible');
    }
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

  async function confirmReject(id: string) {
    if (!rejectReason.trim()) {
      setError('Un motif de refus est requis');
      return;
    }
    await run(id, () => api.bookings.reject(id, rejectReason.trim()));
    setRejectingId(null);
    setRejectReason('');
  }

  const stats = useMemo(() => computeHostStats(bookings), [bookings]);

  const todayTs = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  // Demandes en attente : toujours visibles au-dessus des onglets (voir
  // HostBookings dans le design de référence), pas un onglet parmi d'autres.
  const pendingRequests = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'PENDING')
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [bookings],
  );

  const categoryOf = useCallback(
    (b: Booking): BookingTab => {
      if (b.status === 'CANCELLED' || b.status === 'COMPLETED') return 'past';
      const now = Date.now();
      const start = new Date(b.startDate).getTime();
      const end = new Date(b.endDate).getTime();
      if (now >= end) return 'past';
      if (now >= start) return 'ongoing';
      return 'upcoming';
    },
    [],
  );

  const filteredBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.status !== 'PENDING' && categoryOf(b) === bookingTab)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    [bookings, bookingTab, categoryOf],
  );

  const bookingTabCounts = useMemo(() => {
    const counts: Record<BookingTab, number> = { upcoming: 0, ongoing: 0, past: 0 };
    for (const b of bookings) {
      if (b.status === 'PENDING') continue;
      counts[categoryOf(b)]++;
    }
    return counts;
  }, [bookings, categoryOf]);

  const todayCount = useMemo(
    () =>
      bookings.filter(
        (b) => b.status !== 'CANCELLED' && b.startDate.slice(0, 10) === new Date().toISOString().slice(0, 10),
      ).length,
    [bookings],
  );
  const nextArrival = useMemo(() => {
    const now = Date.now();
    return bookings
      .filter((b) => b.status === 'CONFIRMED' && new Date(b.startDate).getTime() >= now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0];
  }, [bookings]);

  // Espaces occupés aujourd'hui (un séjour confirmé en cours), pas le nombre publié.
  const occupiedTodayCount = useMemo(() => {
    const now = Date.now();
    const occupied = new Set(
      bookings
        .filter(
          (b) =>
            b.status === 'CONFIRMED' &&
            new Date(b.startDate).getTime() <= now &&
            new Date(b.endDate).getTime() >= now,
        )
        .map((b) => b.listingId),
    );
    return occupied.size;
  }, [bookings]);

  const firstListing = listings.find((l) => l.status === 'PUBLISHED') ?? listings[0];
  const publishedCount = listings.filter((l) => l.status === 'PUBLISHED').length;

  // Regroupées par établissement (adresse) — voir HostSpaces dans le design de référence.
  const listingGroups = useMemo(() => {
    const groups = new Map<string, Listing[]>();
    for (const l of listings) {
      const key = `${l.addressLine1}, ${l.postalCode} ${l.city}`;
      const list = groups.get(key) ?? [];
      list.push(l);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [listings]);

  const notifications = useMemo(() => {
    type Item = { text: string; ts: number; onClick?: () => void };
    const items: Item[] = [];
    for (const b of bookings) {
      if (b.status !== 'PENDING') continue;
      items.push({
        text: `Nouvelle demande — ${b.listing?.title ?? 'Annonce'} — ${dateShort(b.startDate)} ${timeShort(b.startDate)}–${timeShort(b.endDate)} — ${eurRound(b.totalAmount)}`,
        ts: new Date(b.createdAt).getTime(),
        onClick: () => setTab('Réservations'),
      });
    }
    for (const l of listings) {
      if (l.createdByCommercial && l.status === 'DRAFT') {
        items.push({
          text: `Fiche « ${l.title} » créée par un commercial, en attente de votre validation`,
          ts: new Date(l.createdAt).getTime(),
          onClick: () => setTab('Établissements & espaces'),
        });
      }
    }
    for (const r of recentReviews) {
      items.push({
        text: `Avis reçu (${r.rating}★) — ${r.listingTitle}`,
        ts: new Date(r.createdAt).getTime(),
        onClick: () => setTab('Avis'),
      });
    }
    // Reversement du mois précédent (clôturé) — même calcul que l'historique
    // de l'onglet Finances, voir host-finances.tsx.
    const now = new Date();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthNet = bookings
      .filter((b) => (b.status === 'CONFIRMED' || b.status === 'COMPLETED') && new Date(b.startDate) >= lastMonthStart && new Date(b.startDate) < monthStart)
      .reduce((sum, b) => sum + netAmount(b), 0);
    if (lastMonthNet > 0) {
      items.push({
        text: `Reversement de ${fmtEUR2(lastMonthNet)} effectué`,
        ts: monthStart.getTime(),
        onClick: () => setTab('Finances'),
      });
    }
    return items.sort((a, b) => b.ts - a.ts).slice(0, 5);
  }, [bookings, listings, recentReviews]);

  if (loading) return <PageLoader />;

  const active = connect?.connected && connect.status === 'active';
  const connectPending = connect?.connected && connect.status !== 'active';

  function renderBookingCard(b: Booking) {
    const isBusy = busyId === b.id;
    const endPassed = new Date(b.endDate).getTime() < todayTs;
    return (
      <div key={b.id} className="card space-y-3 p-3.5">
        <div className="flex items-start gap-3">
          <CategoryIcon type={b.listing?.type ?? 'OTHER'} size={20} className="mt-0.5 flex-none text-brand-fg" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold">{b.listing?.title ?? 'Annonce'}</div>
            <div className="text-xs text-muted">
              {b.tenant ? `${b.tenant.firstName} ${b.tenant.lastName}` : 'Locataire'} ·{' '}
              {fdate(b.startDate)} → {fdate(b.endDate)} · {b.guestCount} pers.
              {b.arrivalTime ? ` · arrivée ${b.arrivalTime}` : ''}
            </div>
            <div className="mt-0.5 text-xs text-muted">Paiement : {PAYMENT_LABEL[b.payment?.status ?? ''] ?? 'en attente'}</div>
            {b.guestNote && <div className="mt-0.5 text-xs italic text-muted">« {b.guestNote} »</div>}
            {b.activityDescription && (
              <div className="mt-1 rounded-md bg-canvas px-2 py-1.5 text-xs text-ink/80">
                <span className="font-semibold text-muted">Activité déclarée : </span>
                {b.activityDescription}
              </div>
            )}
          </div>
          <div className="flex-none text-right">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BK_STATUS[b.status]?.cls ?? 'bg-canvas text-muted'}`}>
              {BK_STATUS[b.status]?.label ?? b.status}
            </span>
            <div className="mt-2 text-sm font-extrabold">{fmtEUR2(netAmount(b))}</div>
            <div className="text-[10px] text-muted">net</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="flex-1" />
          {b.status === 'PENDING' && rejectingId !== b.id && (
            <>
              <button
                disabled={isBusy}
                onClick={() => {
                  setRejectingId(b.id);
                  setRejectReason('');
                }}
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
              <Link href={`/bookings/${b.id}`} className="btn-ghost px-3 py-2 text-[13px]">
                Détail
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
            <Link href={`/bookings/${b.id}`} className="btn-ghost px-3 py-2 text-[13px]">
              Détail
            </Link>
          )}
        </div>

        {rejectingId === b.id && (
          <div className="space-y-2 border-t border-line pt-3">
            <label className="label">Motif du refus (envoyé au locataire)</label>
            <textarea
              rows={2}
              autoFocus
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="field resize-y"
              placeholder="ex. Créneau finalement indisponible pour maintenance"
            />
            <div className="flex gap-2">
              <button
                disabled={isBusy || !rejectReason.trim()}
                onClick={() => confirmReject(b.id)}
                className="btn-primary px-3 py-2 text-[13px]"
              >
                {isBusy ? 'Envoi…' : 'Confirmer le refus'}
              </button>
              <button
                disabled={isBusy}
                onClick={() => {
                  setRejectingId(null);
                  setRejectReason('');
                }}
                className="btn-ghost px-3 py-2 text-[13px]"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {categoryOf(b) === 'past' && (b.status === 'CONFIRMED' || b.status === 'COMPLETED') && (
          <DepositCard bookingId={b.id} role="host" />
        )}
      </div>
    );
  }

  // Tableau Réservations (onglets à venir / en cours) — voir HostBookings
  // dans le design de référence. L'onglet passée garde le format carte
  // (renderBookingCard) pour la gestion de caution.
  function renderBookingRow(b: Booking) {
    const st = TABLE_STATUS_PILL[b.status] ?? { label: b.status, cls: 'bg-canvas text-muted' };
    const isToday = b.startDate.slice(0, 10) === new Date().toISOString().slice(0, 10);
    const isHour = b.listing?.pricingUnit === 'HOUR';
    return (
      <div key={b.id} className="flex items-center gap-3 border-t border-line px-4 py-3.5 text-[13px] first:border-t-0">
        <div className="flex-[1.4] truncate font-medium text-ink">{b.listing?.title ?? 'Annonce'}</div>
        <div className="flex-1 text-muted">{isToday ? "Aujourd'hui" : dateShort(b.startDate)}</div>
        <div className="flex-1 text-muted">
          {isHour ? `${timeShort(b.startDate)}–${timeShort(b.endDate)}` : `→ ${dateShort(b.endDate)}`}
        </div>
        <div className="flex-1 text-ink">{fmtEUR2(netAmount(b))}</div>
        <div className="flex-1 text-muted">{PAYMENT_LABEL[b.payment?.status ?? ''] ?? 'en attente'}</div>
        <div className="flex-1">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <h1 className="text-2xl font-extrabold">{HOST_TAB_TITLE[tab]}</h1>

      {/* Encaissements Stripe — toujours visible, c'est bloquant pour recevoir des réservations. */}
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

      {/* Navigation par onglets — voir HostNav dans le design de référence. */}
      <div className="overflow-x-auto border-b border-line">
        <div className="flex gap-6 whitespace-nowrap">
          {HOST_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-1 py-3 text-sm font-semibold transition-colors ${
                tab === t ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'Tableau de bord' && (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-bold">Aujourd&apos;hui</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Kpi label="Réservations" value={String(todayCount)} />
              <Kpi label="Espaces occupés" value={`${occupiedTodayCount} / ${publishedCount}`} />
              <Kpi
                label="Prochaine arrivée"
                value={nextArrival ? new Date(nextArrival.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                hint={nextArrival?.listing?.title}
              />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold">Ce mois-ci</h2>
            <div className="flex gap-3">
              <Kpi label="Revenu net" value={fmtEUR(stats.revenueMonth)} />
              <Kpi label="Réservations" value={String(stats.bookingsMonth)} />
            </div>
          </section>

          <section className="grid gap-8 sm:grid-cols-2">
            <div>
              <h2 className="mb-3 text-sm font-bold">Actions</h2>
              <div className="flex flex-wrap gap-2.5">
                {firstListing && (
                  <>
                    <Link href={`/listings/${firstListing.id}/edit?tab=Disponibilit%C3%A9s`} className="btn-ghost">
                      Modifier disponibilité
                    </Link>
                    <Link href={`/listings/${firstListing.id}/edit`} className="btn-ghost">
                      Modifier prix
                    </Link>
                    <Link href={`/listings/${firstListing.id}/edit`} className="btn-ghost">
                      Modifier un espace
                    </Link>
                  </>
                )}
                <button onClick={() => setTab('Réservations')} className="btn-ghost">
                  Voir les réservations
                </button>
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-sm font-bold">Notifications récentes</h2>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted">Rien de nouveau pour le moment.</p>
              ) : (
                <div className="card overflow-hidden">
                  {notifications.map((n, i) => (
                    <div
                      key={i}
                      onClick={n.onClick}
                      className={`px-4 py-3 text-sm ${i > 0 ? 'border-t border-line' : ''} ${n.onClick ? 'cursor-pointer hover:bg-canvas' : ''}`}
                    >
                      <p className="text-ink">{n.text}</p>
                      <p className="mt-0.5 text-xs text-muted">{timeAgo(new Date(n.ts).toISOString())}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {pendingRequests.length > 0 && (
            <section>
              <div
                onClick={() => setTab('Réservations')}
                className="card cursor-pointer p-3.5 text-sm hover:bg-canvas"
              >
                <span className="font-semibold text-ink">
                  {pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''} en attente de validation
                </span>
                <span className="text-muted"> — cliquez pour les traiter.</span>
              </div>
            </section>
          )}

          <section className="border-t border-line pt-7">
            <h2 className="mb-3 text-sm font-bold">Calendrier</h2>
            <HostCalendar listings={listings} />
          </section>
        </div>
      )}

      {tab === 'Établissements & espaces' && (
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Tous mes espaces</h2>
            <Link href="/listings/new" className="btn-primary btn-sm">
              + Nouvel espace
            </Link>
          </div>
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
            listingGroups.map(([address, group]) => (
              <div key={address}>
                <p className="mb-2.5 text-sm text-muted">{address}</p>
                <div className="overflow-x-auto rounded-lg border border-line">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-line bg-canvas text-xs font-medium text-muted">
                        <th className="px-4 py-2.5 text-left font-medium">Espace</th>
                        <th className="px-4 py-2.5 text-left font-medium">Type</th>
                        <th className="px-4 py-2.5 text-left font-medium">Capacité</th>
                        <th className="px-4 py-2.5 text-left font-medium">Prix</th>
                        <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                        <th className="w-10 px-4 py-2.5" />
                      </tr>
                    </thead>
                    <tbody>
                      {group.map((l) => {
                        const isBusy = busyId === l.id;
                        const commercialPending = l.createdByCommercial && l.status === 'DRAFT';
                        return (
                          <tr
                            key={l.id}
                            id={`listing-${l.id}`}
                            className={`border-b border-line last:border-b-0 ${
                              createdId === l.id ? 'bg-brand-tint/40' : ''
                            }`}
                          >
                            <td className="px-4 py-3 font-medium text-ink">{l.title}</td>
                            <td className="px-4 py-3 text-muted">{typeLabel(l.type)}</td>
                            <td className="px-4 py-3 text-muted">
                              {l.maxGuests ? `${l.maxGuests} pers.` : '—'}
                            </td>
                            <td className="px-4 py-3 text-ink">
                              {eurRound(l.basePrice)} / {UNIT_LABEL_SHORT[l.pricingUnit] ?? ''}
                            </td>
                            <td className="px-4 py-3">
                              {l.status === 'ARCHIVED' ? (
                                <span className="text-xs text-muted">Archivée</span>
                              ) : commercialPending ? (
                                <span className="rounded-full bg-warn-tint px-2.5 py-1 text-xs font-semibold text-warn-fg">
                                  À valider
                                </span>
                              ) : l.status === 'DRAFT' ? (
                                <span className="text-xs text-muted">Brouillon</span>
                              ) : hostVerified ? (
                                <VerifiedBadge />
                              ) : (
                                <span className="text-xs text-muted">Non vérifié</span>
                              )}
                            </td>
                            <td className="relative px-4 py-3 text-right">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setOpenMenuId(openMenuId === l.id ? null : l.id)}
                                className="rounded-md border border-line px-2 py-1 text-sm leading-none text-ink hover:bg-canvas"
                                aria-label="Actions"
                              >
                                ⋯
                              </button>
                              {openMenuId === l.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                                  <div className="absolute right-4 top-full z-20 w-56 overflow-hidden rounded-lg border border-line bg-surface py-1 text-left shadow-modal">
                                    <Link
                                      href={`/listings/${l.id}`}
                                      className="block px-3.5 py-2 text-sm text-ink hover:bg-canvas"
                                    >
                                      Voir la fiche
                                    </Link>
                                    <Link
                                      href={`/listings/${l.id}/edit`}
                                      className="block px-3.5 py-2 text-sm text-ink hover:bg-canvas"
                                    >
                                      Gérer la fiche
                                    </Link>
                                    <Link
                                      href={`/listings/${l.id}/edit?tab=Disponibilit%C3%A9s`}
                                      className="block px-3.5 py-2 text-sm text-ink hover:bg-canvas"
                                    >
                                      Modifier les disponibilités
                                    </Link>
                                    <Link
                                      href={`/listings/${l.id}/edit?tab=Conditions`}
                                      className="block px-3.5 py-2 text-sm text-ink hover:bg-canvas"
                                    >
                                      Modifier les conditions
                                    </Link>
                                    {l.status === 'DRAFT' && (
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          run(l.id, () => api.listings.setStatus(l.id, 'PUBLISHED'));
                                        }}
                                        className="block w-full px-3.5 py-2 text-left text-sm text-ink hover:bg-canvas"
                                      >
                                        Publier
                                      </button>
                                    )}
                                    {l.status === 'PUBLISHED' && (
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={() => {
                                          setOpenMenuId(null);
                                          run(l.id, () => api.listings.setStatus(l.id, 'DRAFT'));
                                        }}
                                        className="block w-full px-3.5 py-2 text-left text-sm text-ink hover:bg-canvas"
                                      >
                                        Dépublier
                                      </button>
                                    )}
                                    {l.status !== 'ARCHIVED' && (
                                      <button
                                        type="button"
                                        disabled={isBusy}
                                        onClick={async () => {
                                          setOpenMenuId(null);
                                          const ok = await confirm({
                                            title: 'Désactiver cet espace ?',
                                            body: 'Il ne sera plus visible ni réservable. Les réservations en cours ne sont pas affectées.',
                                            confirmLabel: 'Désactiver',
                                            danger: true,
                                          });
                                          if (ok) run(l.id, () => api.listings.archive(l.id));
                                        }}
                                        className="block w-full border-t border-line px-3.5 py-2 text-left text-sm text-danger-fg hover:bg-canvas"
                                      >
                                        Désactiver l&apos;espace
                                      </button>
                                    )}
                                  </div>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {group.some((l) => l.createdByCommercial && l.status === 'DRAFT') && (
                  <p className="mt-2 text-xs text-warn-fg">
                    Une ou plusieurs fiches de cet établissement ont été créées par un commercial —
                    vérifiez les informations puis publiez-les.
                  </p>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {tab === 'Réservations' && (
        <section className="space-y-6">
          {pendingRequests.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-sm font-bold">Demandes en attente ({pendingRequests.length})</h2>
              <div className="space-y-2.5">{pendingRequests.map((b) => renderBookingCard(b))}</div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['upcoming', 'À venir'],
                  ['ongoing', 'En cours'],
                  ['past', 'Passées'],
                ] as [BookingTab, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setBookingTab(key)}
                  className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
                    bookingTab === key
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-surface text-muted hover:text-ink'
                  }`}
                >
                  {label}
                  <span className={bookingTab === key ? 'text-white/80' : 'text-muted'}> · {bookingTabCounts[key]}</span>
                </button>
              ))}
            </div>

            {bookingTab === 'past' ? (
              filteredBookings.length === 0 ? (
                <div className="card p-8 text-center text-sm text-muted">
                  Aucune réservation {BOOKING_TAB_EMPTY_LABEL[bookingTab]}.
                </div>
              ) : (
                <div className="space-y-2.5">{filteredBookings.map((b) => renderBookingCard(b))}</div>
              )
            ) : (
              <div className="overflow-x-auto rounded-lg border border-line">
                <div className="flex min-w-[640px] gap-3 bg-canvas px-4 py-2.5 text-xs font-medium text-muted">
                  <div className="flex-[1.4]">Espace</div>
                  <div className="flex-1">Date</div>
                  <div className="flex-1">Créneau</div>
                  <div className="flex-1">Montant</div>
                  <div className="flex-1">Paiement</div>
                  <div className="flex-1">Statut</div>
                </div>
                <div className="min-w-[640px]">
                  {filteredBookings.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-muted">
                      Aucune réservation {BOOKING_TAB_EMPTY_LABEL[bookingTab]}.
                    </div>
                  ) : (
                    filteredBookings.map((b) => renderBookingRow(b))
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {tab === 'Avis' && <HostReviews />}

      {tab === 'Messagerie' && (
        <section className="space-y-3">
          <p className="text-sm text-muted">
            La réservation ne nécessite jamais d&apos;échange — la messagerie sert aux demandes
            particulières et aux imprévus.
          </p>
          <ConversationsPanel />
        </section>
      )}

      {tab === 'Finances' && <HostFinances />}
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
