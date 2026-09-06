'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import StripePayment from '@/components/stripe-payment';
import { useToast } from '@/components/toast';
import type { Booking } from '@/lib/types';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  CANCELLED: 'Annulée',
  COMPLETED: 'Terminée',
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: '5', comment: '' });
  const [reviewSent, setReviewSent] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const toast = useToast();

  async function handleCancel() {
    if (!confirm('Annuler cette réservation ? Cette action est définitive.')) return;
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

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    api.bookings
      .getById(id)
      .then(setBooking)
      .catch(() => router.replace('/bookings'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handlePay() {
    setPayLoading(true);
    setError(null);
    try {
      const res = await api.bookings.createPaymentIntent(id);
      if (res.simulated) {
        // Mode démo : paiement déjà validé côté API.
        setBooking((b) => (b ? { ...b, status: 'CONFIRMED' } : b));
      } else {
        setClientSecret(res.clientSecret);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur paiement');
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
        rating: parseInt(reviewForm.rating, 10),
        comment: reviewForm.comment || undefined,
        listingId: booking.listingId,
      });
      setReviewSent(true);
      toast.success('Merci pour votre avis !');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    }
  }

  if (loading) return <p className="py-16 text-center text-muted">Chargement…</p>;
  if (!booking) return null;

  const rows: [string, string][] = [
    ['Statut', STATUS_LABEL[booking.status] ?? booking.status],
    ['Arrivée', new Date(booking.startDate).toLocaleDateString('fr-FR')],
    ['Départ', new Date(booking.endDate).toLocaleDateString('fr-FR')],
    ['Locataires', String(booking.guestCount)],
    ...(booking.arrivalTime ? ([['Heure d’arrivée', booking.arrivalTime]] as [string, string][]) : []),
    ['dont frais de service', `${booking.serviceFee} €`],
  ];

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <button onClick={() => router.push('/bookings')} className="text-sm text-muted hover:text-ink">
        ← Mes réservations
      </button>
      <h1 className="text-2xl font-extrabold">Réservation</h1>

      <div className="card space-y-3 p-6">
        <div className="space-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-muted">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-line pt-2 text-sm">
            <span className="font-bold">Total</span>
            <span className="font-extrabold">{booking.totalAmount} €</span>
          </div>
        </div>

        {booking.hostApprovalDeadline && booking.status === 'PENDING' && (
          <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700">
            En attente de validation hôte — deadline&nbsp;:{' '}
            {new Date(booking.hostApprovalDeadline).toLocaleString('fr-FR')}
          </p>
        )}

        {booking.guestNote && (
          <p className="rounded bg-canvas px-3 py-2 text-sm text-ink/80">
            <span className="text-muted">Message pour l&apos;hôte : </span>
            {booking.guestNote}
          </p>
        )}

        {booking.status === 'CONFIRMED' && (
          <div className="space-y-2 rounded-md bg-success-tint px-3 py-2 text-sm text-success-fg">
            <p>✓ Paiement effectué — réservation confirmée.</p>
            <Link href="/conversations" className="font-semibold underline">
              Ouvrir la conversation avec l&apos;hôte
            </Link>
          </div>
        )}

        {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
          <button
            onClick={handleCancel}
            disabled={cancelBusy}
            className="w-full rounded-md border border-line py-2.5 text-sm font-semibold text-muted transition-colors hover:border-danger/40 hover:text-danger-fg"
          >
            {cancelBusy ? '…' : 'Annuler la réservation'}
          </button>
        )}
      </div>

      {/* Paiement */}
      {booking.status === 'PENDING' && !booking.payment && (
        <div className="card space-y-4 p-6">
          <h2 className="font-bold">Paiement</h2>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {clientSecret ? (
            <StripePayment
              clientSecret={clientSecret}
              onSuccess={() => {
                setBooking((b) => (b ? { ...b, status: 'CONFIRMED' } : b));
                setClientSecret(null);
              }}
            />
          ) : (
            <button onClick={handlePay} disabled={payLoading} className="btn-primary w-full">
              {payLoading ? 'Chargement…' : `Payer ${booking.totalAmount} €`}
            </button>
          )}
        </div>
      )}

      {/* Avis */}
      {booking.status === 'COMPLETED' && (
        <div id="review" className="card space-y-4 p-6">
          <h2 className="font-bold">Laisser un avis</h2>
          {reviewSent ? (
            <p className="text-emerald-600">Avis envoyé, merci !</p>
          ) : (
            <form onSubmit={handleReview} className="space-y-3">
              <div>
                <label className="label">Note</label>
                <select
                  value={reviewForm.rating}
                  onChange={(e) => setReviewForm((f) => ({ ...f, rating: e.target.value }))}
                  className="field w-auto"
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {'★'.repeat(n)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Commentaire</label>
                <textarea
                  rows={3}
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                  className="field resize-y"
                />
              </div>
              <button type="submit" className="btn-primary">
                Envoyer l&apos;avis
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
