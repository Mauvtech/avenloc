'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import CategoryIcon from '@/components/category-icon';
import StripePayment from '@/components/stripe-payment';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/confirm';
import { BackLink, PageLoader, StarRating, Stepper } from '@/components/ui';
import { dateLong, eur } from '@/lib/format';
import { typeLabel } from '@/lib/listing';
import type { Booking, Listing } from '@/lib/types';

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'En attente', cls: 'bg-warn-tint text-warn-fg' },
  CONFIRMED: { label: 'Confirmée', cls: 'bg-success-tint text-success-fg' },
  CANCELLED: { label: 'Annulée', cls: 'bg-danger-tint text-danger-fg' },
  COMPLETED: { label: 'Terminée', cls: 'bg-canvas text-muted' },
};

function stepIndex(status: string): number {
  if (status === 'PENDING') return 1;
  if (status === 'CONFIRMED') return 2;
  if (status === 'COMPLETED') return 3;
  return 1;
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [reviewSent, setReviewSent] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    api.bookings
      .getById(id)
      .then((b) => {
        setBooking(b);
        return api.listings.getById(b.listingId).catch(() => null);
      })
      .then((l) => l && setListing(l))
      .catch(() => router.replace('/bookings'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleCancel() {
    const ok = await confirm({
      title: 'Annuler cette réservation ?',
      body: 'Cette action est définitive. Selon la politique d’annulation, un remboursement pourra s’appliquer.',
      confirmLabel: 'Annuler la réservation',
      cancelLabel: 'Revenir',
      danger: true,
    });
    if (!ok) return;
    setCancelBusy(true);
    try {
      const updated = await api.bookings.cancel(id);
      setBooking((b) => (b ? { ...b, status: updated.status } : b));
      toast.success('Réservation annulée');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Annulation impossible');
    } finally {
      setCancelBusy(false);
    }
  }

  async function handlePay() {
    setPayLoading(true);
    setError(null);
    try {
      const res = await api.bookings.createPaymentIntent(id);
      if (res.simulated) {
        setBooking((b) => (b ? { ...b, status: 'CONFIRMED' } : b));
        toast.success('Paiement validé — réservation confirmée');
      } else {
        setClientSecret(res.clientSecret);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de paiement');
    } finally {
      setPayLoading(false);
    }
  }

  async function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (!booking) return;
    try {
      await api.reviews.create({
        bookingId: id,
        target: 'LISTING',
        rating: reviewForm.rating,
        comment: reviewForm.comment || undefined,
        listingId: booking.listingId,
      });
      setReviewSent(true);
      toast.success('Merci pour votre avis !');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Envoi impossible');
    }
  }

  if (loading) return <PageLoader />;
  if (!booking) return null;

  const st = STATUS[booking.status] ?? { label: booking.status, cls: 'bg-canvas text-muted' };
  const cover = listing?.photos?.[0]?.url ?? null;
  const title = listing?.title ?? booking.listing?.title ?? 'Annonce';
  const city = listing?.city ?? booking.listing?.city ?? '';
  const type = listing?.type ?? booking.listing?.type ?? 'OTHER';
  const canPay = booking.status === 'PENDING' && !booking.payment;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <BackLink href="/bookings">Mes réservations</BackLink>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Réservation</h1>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
      </div>

      {booking.status !== 'CANCELLED' && (
        <Stepper steps={['Demande', 'Paiement', 'Confirmée', 'Séjour']} current={stepIndex(booking.status)} />
      )}

      {/* Recap de l'annonce */}
      <Link
        href={`/listings/${booking.listingId}`}
        className="card card-hover flex items-center gap-3 overflow-hidden p-3"
      >
        <div className="h-16 w-20 flex-none overflow-hidden rounded-md bg-canvas">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <CategoryIcon type={type} size={22} className="text-line" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{title}</p>
          <p className="text-xs text-muted">
            {typeLabel(type)}
            {city && ` · ${city}`}
          </p>
        </div>
        <span className="text-muted" aria-hidden>
          →
        </span>
      </Link>

      {/* Détails */}
      <div className="card space-y-3 p-6">
        <div className="space-y-2 text-sm">
          <Row k="Arrivée" v={dateLong(booking.startDate)} />
          <Row k="Départ" v={dateLong(booking.endDate)} />
          {booking.arrivalTime && <Row k="Heure d’arrivée" v={booking.arrivalTime} />}
          <Row k="Voyageurs" v={String(booking.guestCount)} />
        </div>

        <div className="space-y-1.5 border-t border-line pt-3 text-sm">
          <Row k="Sous-total" v={eur(booking.baseAmount)} muted />
          {Number(booking.cleaningFee) > 0 && (
            <Row k="Frais de ménage" v={eur(booking.cleaningFee)} muted />
          )}
          <Row k="Frais de service" v={eur(booking.serviceFee)} muted />
          {Number(booking.taxAmount) > 0 && <Row k="Taxes" v={eur(booking.taxAmount)} muted />}
          <div className="flex justify-between border-t border-line pt-2">
            <span className="font-bold">Total</span>
            <span className="font-extrabold tabular-nums">{eur(booking.totalAmount)}</span>
          </div>
        </div>

        {booking.hostApprovalDeadline && booking.status === 'PENDING' && (
          <p className="rounded-md bg-warn-tint px-3 py-2 text-xs text-warn-fg">
            En attente de validation de l’hôte — réponse attendue avant le{' '}
            {new Date(booking.hostApprovalDeadline).toLocaleString('fr-FR')}.
          </p>
        )}

        {booking.guestNote && (
          <p className="rounded-md bg-canvas px-3 py-2 text-sm text-ink/80">
            <span className="text-muted">Votre message : </span>
            {booking.guestNote}
          </p>
        )}

        {booking.status === 'CONFIRMED' && (
          <div className="space-y-1.5 rounded-md bg-success-tint px-3 py-2.5 text-sm text-success-fg">
            <p className="font-semibold">✓ Paiement effectué — réservation confirmée.</p>
            <Link href="/conversations" className="font-semibold underline">
              Ouvrir la conversation avec l’hôte
            </Link>
          </div>
        )}

        {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
          <button
            onClick={handleCancel}
            disabled={cancelBusy}
            className="w-full rounded-md border border-line py-2.5 text-sm font-semibold text-muted transition-colors hover:border-danger/40 hover:text-danger-fg disabled:opacity-50"
          >
            {cancelBusy ? 'Annulation…' : 'Annuler la réservation'}
          </button>
        )}
      </div>

      {/* Paiement */}
      {canPay && (
        <div className="card space-y-4 p-6">
          <h2 className="section-title">Paiement</h2>
          <p className="text-xs text-muted">
            Vous ne serez débité qu’après confirmation de l’hôte. Paiement sécurisé via Stripe.
          </p>
          {error && <p className="text-sm text-danger-fg">{error}</p>}
          {clientSecret ? (
            <StripePayment
              clientSecret={clientSecret}
              onSuccess={() => {
                setBooking((b) => (b ? { ...b, status: 'CONFIRMED' } : b));
                setClientSecret(null);
                toast.success('Paiement validé');
              }}
            />
          ) : (
            <button onClick={handlePay} disabled={payLoading} className="btn-primary w-full">
              {payLoading ? 'Chargement…' : `Payer ${eur(booking.totalAmount)}`}
            </button>
          )}
        </div>
      )}

      {/* Avis */}
      {booking.status === 'COMPLETED' && (
        <div id="review" className="card space-y-4 p-6">
          <h2 className="section-title">Laisser un avis</h2>
          {reviewSent ? (
            <p className="text-sm font-semibold text-success-fg">Avis envoyé, merci !</p>
          ) : (
            <form onSubmit={handleReview} className="space-y-3">
              <div>
                <label className="label">Note</label>
                <StarRating
                  value={reviewForm.rating}
                  onChange={(rating) => setReviewForm((f) => ({ ...f, rating }))}
                />
              </div>
              <div>
                <label className="label">Commentaire</label>
                <textarea
                  rows={3}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                  className="field resize-y"
                  placeholder="Votre expérience, l’accueil, la conformité à l’annonce…"
                />
              </div>
              <button type="submit" className="btn-primary">
                Envoyer l’avis
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{k}</span>
      <span className={`tabular-nums ${muted ? 'text-ink' : 'font-semibold'}`}>{v}</span>
    </div>
  );
}
