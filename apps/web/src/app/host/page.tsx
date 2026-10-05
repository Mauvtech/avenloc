
'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PageLoader } from '@/components/ui';
import HostCalendar from '@/components/host-calendar';
import { computeHostStats, fmtEUR } from '@/lib/host-stats';
import { parisDay } from '@/lib/host-calendar';
import { useHostGuard } from './use-host-guard';
import type { Booking, Listing, Review } from '@/lib/types';
const BORDER = '#E7E7E7', INK = '#14171A', GRAY = '#6B7280';
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, flex: 1 }}>
    <div style={{ fontSize: 13, color: GRAY }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: INK, marginTop: 6 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: GRAY, marginTop: 4 }}>{sub}</div>}
  </div>;
}
export default function HostDashboardPage() {
  const { ready } = useHostGuard();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [spaces, setSpaces] = useState<Listing[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!ready) return;
    Promise.all([api.bookings.asHost(), api.listings.mine(), api.reviews.byHost()])
      .then(([bookings, spaces, reviews]) => { setBookings(bookings); setSpaces(spaces); setReviews(reviews); })
      .catch(() => setError('Impossible de charger le tableau de bord. Rechargez la page.'))
      .finally(() => setLoading(false));
  }, [ready]);
  const stats = useMemo(() => computeHostStats(bookings), [bookings]);
  if (!ready || loading) return <PageLoader />;
  if (error) return <p role="alert" className="text-sm text-danger-fg">{error}</p>;
  const now = new Date(), todayKey = parisDay(now.toISOString());
  const today = bookings.filter((booking) => booking.status !== 'CANCELLED' && parisDay(booking.startAt) === todayKey);
  const occupied = new Set(bookings.filter((booking) => booking.status === 'CONFIRMED' && new Date(booking.startAt) <= now && new Date(booking.endAt) > now).map((booking) => booking.listingId)).size;
  const nextArrival = today.filter((booking) => booking.status === 'CONFIRMED' && new Date(booking.startAt) > now).sort((a,b) => a.startAt.localeCompare(b.startAt))[0];
  const monthCount = bookings.filter((booking) => booking.status !== 'CANCELLED' && parisDay(booking.startAt).slice(0,7) === todayKey.slice(0,7)).length;
  const firstSpace = spaces.find((space) => space.status === 'PUBLISHED') ?? spaces[0];
  const onModifierDispo = () => router.push(firstSpace ? `/listings/${firstSpace.id}/calendar` : '/host/spaces');
  const onModifierPrix = () => router.push(firstSpace ? `/listings/${firstSpace.id}/edit` : '/host/spaces');
  const onModifierEspace = onModifierPrix;
  const onVoirReservations = () => router.push('/host/reservations');
  const events = [
    ...bookings.map((booking) => ({ text: `Nouvelle réservation · ${booking.listing?.title ?? 'Espace'} · ${fmtEUR(booking.totalAmount)}`, date: booking.createdAt, href: '/host/reservations' })),
    ...spaces.filter((space) => space.status === 'PENDING_VALIDATION').map((space) => ({ text: `Fiche « ${space.title} » créée par un commercial, en attente de votre validation`, date: space.createdAt, href: `/listings/${space.id}/edit` })),
    ...reviews.map((review) => ({ text: `Avis reçu (${review.rating}★) · ${review.listingTitle ?? 'Espace'}`, date: review.createdAt, href: '/host/reviews' })),
  ];
  const notifications = events.sort((a,b) => b.date.localeCompare(a.date)).slice(0,4).map((event) => ({ ...event, time: new Date(event.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }));
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 24 }}>Bonjour 👋</h1>

      <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Aujourd'hui</div>
      <div className="mkt-stat-row" style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <StatCard label="Réservations" value={String(today.length)} />
        <StatCard label="Espaces occupés" value={`${occupied} / ${spaces.filter((space) => space.status === "PUBLISHED").length}`} />
        <StatCard label="Prochaine arrivée" value={nextArrival ? new Date(nextArrival.startAt).toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).replace(":", "h") : "Aucune"} sub={nextArrival?.listing?.title} />
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Ce mois-ci</div>
      <div className="mkt-stat-row" style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <StatCard label="Revenu net" value={fmtEUR(stats.revenueMonth)} />
        <StatCard label="Réservations" value={String(monthCount)} />
      </div>

      <div className="mkt-two-col-equal" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Actions</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" onClick={onModifierDispo} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: INK, cursor: "pointer" }}>
              Modifier disponibilité
            </button>
            <button type="button" onClick={onModifierPrix} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: INK, cursor: "pointer" }}>
              Modifier prix
            </button>
            <button type="button" onClick={onModifierEspace} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: INK, cursor: "pointer" }}>
              Modifier un espace
            </button>
            <button type="button" onClick={onVoirReservations} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: INK, cursor: "pointer" }}>
              Voir les réservations
            </button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Notifications récentes</div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            {notifications.length === 0 && <p className="px-4 py-3 text-[13px] text-muted">Aucune notification pour le moment.</p>}
            {notifications.map((n, i, arr) => (
              <div key={i} onClick={() => router.push(n.href)} role="link" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") router.push(n.href); }} style={{ padding: "12px 16px", borderTop: i > 0 ? `1px solid ${BORDER}` : "none", cursor: "pointer" }}>
                <div style={{ fontSize: 13, color: INK }}>{n.text}</div>
                <div style={{ fontSize: 11, color: GRAY, marginTop: 3 }}>{n.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32, borderTop: `1px solid ${BORDER}`, paddingTop: 28 }}>
        <HostCalendar bookings={bookings} spaces={spaces} />
      </div>
    </div>
  );
}
