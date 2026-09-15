'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated, loginHref } from '@/lib/auth';
import DateRangePicker from '@/components/date-range-picker';
import TimeSlotPicker from '@/components/time-slot-picker';
import PriceBreakdown from '@/components/price-breakdown';
import { Breadcrumbs, Skeleton } from '@/components/ui';
import { eur } from '@/lib/format';
import { CANCELLATION_LABEL } from '@/lib/listing';
import type { Listing, Quote, User } from '@/lib/types';

// Étape 2 du parcours de réservation (voir ClientReservation dans le
// prototype) — dissociée de la fiche annonce : créneau/dates, informations,
// puis récapitulatif + paiement. Accessible sans compte ; la connexion n'est
// demandée qu'au moment de soumettre (voir handleBook).
export default function ReservePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);

  const [range, setRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    guestCount: '1',
    arrivalTime: '',
    guestNote: '',
    activityDescription: '',
    rcProConfirmed: false,
    houseRulesAccepted: false,
  });
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
    Promise.all([
      api.listings.getById(id),
      isAuthenticated() ? api.auth.me().catch(() => null) : Promise.resolve(null),
    ])
      .then(([l, me]: [Listing, User | null]) => {
        // Un hôte ne réserve pas son propre espace.
        if (me && me.id === l.hostId) {
          router.replace(`/listings/${id}`);
          return;
        }
        setListing(l);

        // Restaure la sélection en cours si l'utilisateur revient d'une
        // connexion/inscription déclenchée depuis cette même page.
        try {
          const raw = sessionStorage.getItem(`aven:draft:${id}`);
          if (raw) {
            const draft = JSON.parse(raw) as {
              range?: typeof range;
              bookingForm?: typeof bookingForm;
            };
            if (draft.range) setRange(draft.range);
            if (draft.bookingForm) setBookingForm(draft.bookingForm);
            sessionStorage.removeItem(`aven:draft:${id}`);
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => router.replace(`/listings/${id}`))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Devis live dès que le créneau/les dates sont choisis.
  useEffect(() => {
    if (!range?.startDate || !range?.endDate) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    api.bookings
      .quote({ listingId: id, startDate: range.startDate, endDate: range.endDate })
      .then((q) => !cancelled && setQuote(q))
      .catch(() => !cancelled && setQuote(null))
      .finally(() => !cancelled && setQuoting(false));
    return () => {
      cancelled = true;
    };
  }, [range, id]);

  function saveDraft() {
    try {
      sessionStorage.setItem(`aven:draft:${id}`, JSON.stringify({ range, bookingForm }));
    } catch {
      /* ignore */
    }
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!range?.startDate || !range?.endDate) {
      setBookingError(
        listing?.pricingUnit === 'HOUR'
          ? 'Choisissez un créneau.'
          : 'Choisissez vos dates d’arrivée et de départ.',
      );
      return;
    }
    if (!listing?.instantBookEnabled && !bookingForm.activityDescription.trim()) {
      setBookingError("Décrivez l'activité et l'usage prévus de l'espace.");
      return;
    }
    if (listing?.rcProRequired && !bookingForm.rcProConfirmed) {
      setBookingError('Confirmez votre assurance RC Pro pour continuer.');
      return;
    }
    if (listing?.houseRules && !bookingForm.houseRulesAccepted) {
      setBookingError('Acceptez le règlement intérieur pour continuer.');
      return;
    }
    setBookingError(null);

    // La réservation reste accessible sans compte jusqu'ici — la connexion
    // n'est demandée qu'à cette dernière étape, juste avant de créer la
    // réservation (Booking.tenantId doit référencer un compte réel).
    if (!isAuthenticated()) {
      saveDraft();
      router.push(loginHref(pathname));
      return;
    }

    setBookingLoading(true);
    try {
      const booking = await api.bookings.create({
        listingId: id,
        startDate: range.startDate,
        endDate: range.endDate,
        guestCount: parseInt(bookingForm.guestCount, 10),
        arrivalTime: bookingForm.arrivalTime || undefined,
        guestNote: bookingForm.guestNote || undefined,
        activityDescription: bookingForm.activityDescription || undefined,
        rcProConfirmed: bookingForm.rcProConfirmed,
        houseRulesAccepted: bookingForm.houseRulesAccepted,
      });
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Erreur lors de la réservation');
    } finally {
      setBookingLoading(false);
    }
  }

  if (loading) return <ReserveSkeleton />;
  if (!listing) return null;

  const isHour = listing.pricingUnit === 'HOUR';
  const canSubmit =
    !!range?.startDate &&
    !!range?.endDate &&
    (listing.instantBookEnabled || bookingForm.activityDescription.trim().length > 0) &&
    (!listing.rcProRequired || bookingForm.rcProConfirmed) &&
    (!listing.houseRules || bookingForm.houseRulesAccepted);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Espaces', href: '/' },
          { label: listing.title, href: `/listings/${listing.id}` },
          { label: 'Réservation' },
        ]}
      />

      <h1 className="text-xl font-extrabold sm:text-2xl">
        {isHour ? 'Choisissez un créneau' : 'Choisissez vos dates'}
      </h1>

      <form onSubmit={handleBook} className="grid gap-8 md:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <div>
            {isHour ? (
              <TimeSlotPicker listingId={listing.id} value={range} onChange={setRange} />
            ) : (
              <DateRangePicker listingId={listing.id} value={range} onChange={setRange} />
            )}
          </div>

          <div className={isHour ? '' : 'grid grid-cols-2 gap-3'}>
            <div>
              <label className="label">Locataires</label>
              <input
                type="number"
                min="1"
                required
                value={bookingForm.guestCount}
                onChange={(e) => setBookingForm((f) => ({ ...f, guestCount: e.target.value }))}
                className="field"
              />
            </div>
            {!isHour && (
              <div>
                <label className="label">Arrivée</label>
                <input
                  type="time"
                  value={bookingForm.arrivalTime}
                  onChange={(e) => setBookingForm((f) => ({ ...f, arrivalTime: e.target.value }))}
                  className="field"
                />
              </div>
            )}
          </div>

          <div>
            <label className="label">
              Message pour l&apos;hôte <span className="font-normal">(optionnel)</span>
            </label>
            <textarea
              rows={2}
              value={bookingForm.guestNote}
              onChange={(e) => setBookingForm((f) => ({ ...f, guestNote: e.target.value }))}
              className="field resize-y"
            />
          </div>

          {!listing.instantBookEnabled && (
            <div>
              <label className="label">Décrivez l&apos;activité et l&apos;usage prévus de l&apos;espace</label>
              <p className="mb-1 text-xs text-muted">
                L&apos;hôte valide chaque demande selon l&apos;activité déclarée avant de confirmer la
                réservation.
              </p>
              <textarea
                rows={3}
                required
                placeholder="ex. Tournage photo pour une marque de vêtements, 4 personnes sur place"
                value={bookingForm.activityDescription}
                onChange={(e) =>
                  setBookingForm((f) => ({ ...f, activityDescription: e.target.value }))
                }
                className="field resize-y"
              />
            </div>
          )}

          {listing.rcProRequired && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={bookingForm.rcProConfirmed}
                onChange={(e) => setBookingForm((f) => ({ ...f, rcProConfirmed: e.target.checked }))}
              />
              Je certifie disposer d&apos;une assurance responsabilité civile professionnelle (RC
              Pro) en cours de validité.
            </label>
          )}

          {listing.houseRules && (
            <div className="space-y-1.5">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={bookingForm.houseRulesAccepted}
                  onChange={(e) =>
                    setBookingForm((f) => ({ ...f, houseRulesAccepted: e.target.checked }))
                  }
                />
                J&apos;ai lu et j&apos;accepte le règlement intérieur de l&apos;espace.
              </label>
              <details className="rounded-md bg-canvas p-2 text-xs text-muted">
                <summary className="cursor-pointer font-semibold text-ink">
                  Lire le règlement intérieur
                </summary>
                <p className="mt-1 whitespace-pre-wrap">{listing.houseRules}</p>
              </details>
            </div>
          )}
        </div>

        {/* Récapitulatif */}
        <div>
          <div className="card sticky top-20 space-y-3 p-4 shadow-raised">
            <div className="font-bold">Récapitulatif</div>
            <Row k="Espace" v={listing.title} />
            <Row
              k={isHour ? 'Créneau' : 'Dates'}
              v={
                range?.startDate && range?.endDate
                  ? isHour
                    ? `${new Date(range.startDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} – ${new Date(range.endDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                    : `${range.startDate} → ${range.endDate}`
                  : '—'
              }
            />
            <Row
              k="Annulation"
              v={CANCELLATION_LABEL[listing.cancellationPolicy] ?? listing.cancellationPolicy}
            />

            {quoting && <Skeleton className="h-24 w-full" />}
            {quote && !quoting && (
              <div className="border-t border-line pt-3">
                <PriceBreakdown quote={quote} />
              </div>
            )}

            {bookingError && <p className="text-xs text-danger-fg">{bookingError}</p>}

            <button
              type="submit"
              disabled={bookingLoading || !canSubmit}
              className="btn-primary btn-lg w-full"
            >
              {bookingLoading
                ? 'Réservation…'
                : quote
                  ? `${listing.instantBookEnabled ? 'Confirmer et payer' : 'Envoyer la demande de réservation'} · ${eur(quote.totalAmount)}`
                  : listing.instantBookEnabled
                    ? 'Confirmer et payer'
                    : 'Envoyer la demande de réservation'}
            </button>
            <p className="text-center text-[11px] text-muted">
              {loggedIn
                ? "Vous ne serez débité qu'après confirmation."
                : 'Connexion requise pour finaliser — vos informations sont conservées.'}
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted">{k}</span>
      <span className="text-right font-semibold text-ink">{v}</span>
    </div>
  );
}

function ReserveSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Skeleton className="h-4 w-52" />
      <Skeleton className="h-7 w-64" />
      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    </div>
  );
}
