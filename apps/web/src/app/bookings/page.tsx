'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated, loginHref } from '@/lib/auth';
import { useToast } from '@/components/toast';
import CategoryIcon from '@/components/category-icon';
import DepositCard from '@/components/deposit-card';
import { EmptyState, PageHeader, Skeleton, StarRating } from '@/components/ui';
import { dateShort, eur, timeShort } from '@/lib/format';
import { typeLabel } from '@/lib/listing';
import type { Booking } from '@/lib/types';

const TABS = ['à venir', 'en cours', 'passée'] as const;
type Tab = (typeof TABS)[number];

function categoryOf(b: Booking): Tab {
  if (b.status === 'CANCELLED' || b.status === 'COMPLETED') return 'passée';
  const now = Date.now();
  const start = new Date(b.startDate).getTime();
  const end = new Date(b.endDate).getTime();
  if (now >= end) return 'passée';
  if (now >= start) return 'en cours';
  return 'à venir';
}

const CATEGORY_BADGE: Record<Tab, string> = {
  'à venir': 'bg-brand-tint text-brand-fg',
  'en cours': 'bg-success-tint text-success-fg',
  'passée': 'bg-canvas text-muted',
};

export default function BookingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [pendingReviewIds, setPendingReviewIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>('à venir');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(loginHref(pathname));
      return;
    }
    api.bookings.mine().then(setBookings).catch(() => setBookings([]));
    api.reviews
      .pending()
      .then((pending) =>
        setPendingReviewIds(
          new Set(pending.filter((p) => p.possibleTargets.includes('LISTING')).map((p) => p.bookingId)),
        ),
      )
      .catch(() => {});
  }, [router, pathname]);

  function patch(id: string, data: Partial<Booking>) {
    setBookings((all) => (all ? all.map((b) => (b.id === id ? { ...b, ...data } : b)) : all));
  }

  const filtered = (bookings ?? []).filter((b) => categoryOf(b) === tab);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Mes réservations" />

      <div className="flex w-fit gap-1 rounded-lg bg-canvas p-[3px]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-[13px] font-semibold capitalize transition-colors ${
              tab === t ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {bookings === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🗓"
          title={`Aucune réservation ${tab}`}
          action={
            tab === 'à venir' ? (
              <Link href="/" className="btn-primary">
                Trouver un espace
              </Link>
            ) : undefined
          }
        >
          {tab === 'à venir' && 'Vos réservations à venir et en cours apparaîtront ici.'}
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              category={tab}
              alreadyReviewed={b.status === 'COMPLETED' && !pendingReviewIds.has(b.id)}
              onChange={(data) => patch(b.id, data)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingCard({
  booking,
  category,
  alreadyReviewed,
  onChange,
}: {
  booking: Booking;
  category: Tab;
  alreadyReviewed: boolean;
  onChange: (data: Partial<Booking>) => void;
}) {
  const toast = useToast();
  const [expanded, setExpanded] = useState<'issue' | 'review' | null>(null);
  const [issueText, setIssueText] = useState('');
  const [issueSending, setIssueSending] = useState(false);
  const [issueSent, setIssueSent] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);
  const reviewDone = reviewSent || alreadyReviewed;
  const [busy, setBusy] = useState(false);

  const title = booking.listing?.title ?? 'Annonce';
  const city = booking.listing?.city ?? '';
  const type = booking.listing?.type ?? 'OTHER';
  const address =
    booking.listing?.addressLine1 && booking.listing?.postalCode
      ? `${booking.listing.addressLine1}, ${booking.listing.postalCode} ${city}`
      : city
        ? `${typeLabel(type)} · ${city}`
        : '';
  const sameDay = booking.startDate.slice(0, 10) === booking.endDate.slice(0, 10);

  async function handleCheckIn() {
    setBusy(true);
    try {
      const updated = await api.bookings.checkIn(booking.id);
      onChange({ checkedInAt: updated.checkedInAt });
      toast.success('Check-in confirmé');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Check-in impossible');
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckOut() {
    setBusy(true);
    try {
      const updated = await api.bookings.checkOut(booking.id);
      onChange({ checkedOutAt: updated.checkedOutAt });
      toast.success('Check-out confirmé, merci !');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Check-out impossible');
    } finally {
      setBusy(false);
    }
  }

  async function handleReportIssue() {
    if (!issueText.trim()) return;
    setIssueSending(true);
    try {
      const conv = await api.conversations.create({ listingId: booking.listingId });
      await api.conversations.send(conv.id, `🛠 Problème signalé : ${issueText.trim()}`);
      setIssueSent(true);
      setExpanded(null);
      toast.success('Signalement envoyé à l’hôte');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Envoi impossible');
    } finally {
      setIssueSending(false);
    }
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewSending(true);
    try {
      await api.reviews.create({
        bookingId: booking.id,
        target: 'LISTING',
        rating: reviewForm.rating,
        comment: reviewForm.comment || undefined,
        listingId: booking.listingId,
      });
      setReviewSent(true);
      setExpanded(null);
      toast.success('Merci pour votre avis !');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Envoi impossible');
    } finally {
      setReviewSending(false);
    }
  }

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/bookings/${booking.id}`} className="min-w-0 flex-1 group">
          <div className="flex items-center gap-2">
            <CategoryIcon type={type} size={16} className="flex-none text-muted" />
            <p className="truncate text-sm font-bold group-hover:underline">{title}</p>
          </div>
          {address && <p className="mt-0.5 truncate text-xs text-muted">{address}</p>}
          <p className="mt-1.5 text-sm text-ink">
            {sameDay ? (
              <>
                {dateShort(booking.startDate)} · {timeShort(booking.startDate)}–{timeShort(booking.endDate)}
              </>
            ) : (
              <>
                {dateShort(booking.startDate)} → {dateShort(booking.endDate)}
              </>
            )}
          </p>
        </Link>
        <div className="flex-none text-right">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${CATEGORY_BADGE[category]}`}>
            {category}
          </span>
          <p className="mt-2 text-sm font-bold tabular-nums">{eur(booking.totalAmount)}</p>
        </div>
      </div>

      {category === 'à venir' && (
        <p className="text-xs text-muted">Rappel automatique prévu 24h avant l&apos;arrivée.</p>
      )}
      {category === 'en cours' && booking.checkedInAt && !booking.checkedOutAt && (
        <p className="text-xs text-muted">Rappel automatique prévu avant la fin du créneau.</p>
      )}

      <div className="flex flex-wrap gap-2">
        {category === 'à venir' && (
          <Link href={`/bookings/${booking.id}`} className="btn-ghost btn-sm">
            Voir les instructions d&apos;accès
          </Link>
        )}

        {category === 'en cours' && !booking.checkedInAt && (
          <button onClick={handleCheckIn} disabled={busy} className="btn-primary btn-sm">
            Confirmer le check-in
          </button>
        )}
        {category === 'en cours' && booking.checkedInAt && !booking.checkedOutAt && (
          <button onClick={handleCheckOut} disabled={busy} className="rounded-md bg-ink px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Confirmer le check-out
          </button>
        )}
        {category === 'en cours' && booking.checkedInAt && booking.checkedOutAt && (
          <span className="text-xs text-muted">Check-out confirmé, merci !</span>
        )}
        {category === 'en cours' && !issueSent && (
          <button onClick={() => setExpanded(expanded === 'issue' ? null : 'issue')} className="btn-ghost btn-sm">
            Signaler un problème
          </button>
        )}
        {category === 'en cours' && issueSent && <span className="text-xs text-success-fg">✓ Signalement envoyé</span>}

        {category === 'passée' && booking.status !== 'CANCELLED' && !reviewDone && (
          <button onClick={() => setExpanded(expanded === 'review' ? null : 'review')} className="btn-ghost btn-sm">
            Laisser un avis
          </button>
        )}
        {category === 'passée' && reviewDone && <span className="text-xs text-success-fg">Avis envoyé — merci !</span>}
        {category === 'passée' && booking.status === 'CANCELLED' && (
          <span className="text-xs text-muted">Réservation annulée</span>
        )}
      </div>

      {expanded === 'issue' && (
        <div className="space-y-2 border-t border-line pt-3">
          <textarea
            rows={2}
            value={issueText}
            onChange={(e) => setIssueText(e.target.value)}
            placeholder="Décrivez le problème rencontré…"
            className="field resize-y text-sm"
          />
          <button
            onClick={handleReportIssue}
            disabled={issueSending || !issueText.trim()}
            className="btn-primary btn-sm"
          >
            {issueSending ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      )}

      {expanded === 'review' && (
        <form onSubmit={handleReview} className="space-y-2 border-t border-line pt-3">
          <StarRating value={reviewForm.rating} onChange={(rating) => setReviewForm((f) => ({ ...f, rating }))} size={18} />
          <textarea
            rows={2}
            value={reviewForm.comment}
            onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
            placeholder="Votre expérience, l’accueil, la conformité à l’annonce…"
            className="field resize-y text-sm"
          />
          <button type="submit" disabled={reviewSending} className="btn-primary btn-sm">
            {reviewSending ? 'Envoi…' : 'Envoyer l’avis'}
          </button>
        </form>
      )}

      {category === 'passée' && (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') && (
        <DepositCard bookingId={booking.id} role="tenant" />
      )}
    </div>
  );
}
