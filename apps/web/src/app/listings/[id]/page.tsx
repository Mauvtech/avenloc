'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import CategoryIcon from '@/components/category-icon';
import DateRangePicker from '@/components/date-range-picker';
import PriceBreakdown from '@/components/price-breakdown';
import Avatar from '@/components/avatar';
import { Skeleton } from '@/components/ui';
import { useToast } from '@/components/toast';
import {
  CANCELLATION_LABEL,
  LISTING_STATUS_CLASS,
  LISTING_STATUS_LABEL,
  typeLabel,
  UNIT_LABEL_SHORT,
} from '@/lib/listing';
import type { Listing, Quote, ReviewList, User } from '@/lib/types';

const attrValue = (v: unknown) =>
  typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : v == null ? '—' : String(v);
const humanize = (k: string) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
const eur = (v: string | number) =>
  Number(v).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<ReviewList | null>(null);
  const [me, setMe] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [range, setRange] = useState<{ startDate: string; endDate: string } | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [bookingForm, setBookingForm] = useState({ guestCount: '1', arrivalTime: '', guestNote: '' });
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.listings.getById(id),
      api.reviews.byListing(id),
      isAuthenticated() ? api.auth.me().catch(() => null) : Promise.resolve(null),
    ])
      .then(([l, r, u]) => {
        setListing(l);
        setReviews(r);
        setMe(u);
      })
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Devis live dès que les deux dates sont choisies.
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

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated()) return router.push('/auth/login');
    if (!range?.startDate || !range?.endDate) {
      setBookingError('Choisissez vos dates d’arrivée et de départ.');
      return;
    }
    setBookingError(null);
    setBookingLoading(true);
    try {
      const booking = await api.bookings.create({
        listingId: id,
        startDate: range.startDate,
        endDate: range.endDate,
        guestCount: parseInt(bookingForm.guestCount, 10),
        arrivalTime: bookingForm.arrivalTime || undefined,
        guestNote: bookingForm.guestNote || undefined,
      });
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Erreur lors de la réservation');
    } finally {
      setBookingLoading(false);
    }
  }

  async function handleContact() {
    if (!isAuthenticated()) return router.push('/auth/login');
    try {
      await api.conversations.create({ listingId: id });
      router.push('/conversations');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible d’ouvrir la conversation');
    }
  }

  async function toggleStatus() {
    if (!listing) return;
    setStatusBusy(true);
    try {
      const next = listing.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
      const updated = await api.listings.setStatus(listing.id, next);
      setListing((l) => (l ? { ...l, status: updated.status } : l));
      toast.success(next === 'PUBLISHED' ? 'Annonce publiée' : 'Annonce dépubliée');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setStatusBusy(false);
    }
  }

  const specificAttrs = useMemo(
    () => Object.entries(listing?.specificAttributes ?? {}),
    [listing],
  );

  if (loading) return <ListingSkeleton />;
  if (!listing) return null;

  const unit = UNIT_LABEL_SHORT[listing.pricingUnit] ?? listing.pricingUnit;
  const isOwner = !!me && me.id === listing.hostId;
  const paymentsReady = listing.hostPaymentsReady !== false;
  const photos = listing.photos;
  const rating = reviews?.averageRating ?? null;
  const host = listing.host;
  const memberSince = host?.createdAt
    ? new Date(host.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <button onClick={() => router.back()} className="text-sm text-muted hover:text-ink">
        ← Retour
      </button>

      {isOwner && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand-tint/60 px-4 py-3 text-sm">
          <span className="font-semibold text-brand-fg">Aperçu de votre annonce</span>
          <span className="text-muted">— ce que voient les locataires.</span>
          <Link href="/host" className="ml-auto font-semibold text-brand-fg">
            Gérer
          </Link>
        </div>
      )}

      {/* En-tête */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge">
            <CategoryIcon type={listing.type} size={13} />
            {typeLabel(listing.type)}
          </span>
          {listing.instantBookEnabled ? (
            <span className="rounded-full bg-success-tint px-2.5 py-0.5 text-[11px] font-bold text-success-fg">
              ⚡ Réservation instantanée
            </span>
          ) : (
            <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-bold text-muted">
              Sur validation de l&apos;hôte
            </span>
          )}
        </div>
        <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{listing.title}</h1>
        <p className="text-sm text-muted">
          {rating !== null && (
            <span className="font-semibold text-ink">
              ★ {rating.toFixed(1)}
              {reviews && reviews.total > 0 && ` · ${reviews.total} avis`}
            </span>
          )}
          {rating !== null && ' · '}
          {listing.city}
        </p>
      </div>

      {/* Galerie */}
      {photos.length === 0 && (
        <div className="flex h-40 items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-canvas text-sm text-muted sm:h-56">
          <CategoryIcon type={listing.type} size={30} className="text-line" />
          Aucune photo pour cette annonce
        </div>
      )}
      {photos.length === 1 && (
        <button
          onClick={() => setLightbox(photos[0].url)}
          className="group block aspect-[16/9] w-full overflow-hidden rounded-lg bg-canvas"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photos[0].url}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </button>
      )}
      {photos.length >= 2 && (
        <div className="grid gap-2 overflow-hidden rounded-lg sm:aspect-[2.4/1] sm:grid-cols-4 sm:grid-rows-2">
          {photos.slice(0, 5).map((p, i) => (
            <button
              key={p.id}
              onClick={() => setLightbox(p.url)}
              className={`group relative overflow-hidden bg-canvas ${
                i === 0
                  ? 'aspect-[16/10] sm:col-span-2 sm:row-span-2 sm:aspect-auto'
                  : 'hidden aspect-[4/3] sm:block'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={listing.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        {/* Colonne principale */}
        <div className="space-y-8">
          {/* Hôte */}
          {host && (
            <section className="flex items-center gap-4 border-b border-line pb-6">
              <Link href={`/users/${host.id}`} className="flex min-w-0 flex-1 items-center gap-4">
                <Avatar src={host.avatarUrl} name={`${host.firstName} ${host.lastName}`} size={52} />
                <div className="min-w-0">
                  <p className="font-bold">Proposé par {host.firstName}</p>
                  {memberSince && <p className="text-sm text-muted">Membre depuis {memberSince}</p>}
                </div>
              </Link>
              {listing.maxGuests && (
                <span className="rounded-full bg-canvas px-3 py-1 text-xs font-semibold text-muted">
                  {listing.maxGuests} locataire(s) max
                </span>
              )}
            </section>
          )}
          {host?.bio && (
            <p className="-mt-4 text-sm leading-relaxed text-ink/80">{host.bio}</p>
          )}

          {specificAttrs.length > 0 && (
            <section>
              <h2 className="section-title mb-3">Caractéristiques</h2>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
                {specificAttrs.map(([key, value]) => (
                  <div key={key} className="rounded-md border border-line px-3 py-2">
                    <div className="text-[11px] text-muted">{humanize(key)}</div>
                    <div className="text-sm font-bold">{attrValue(value)}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="section-title mb-2">Description</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
              {listing.description}
            </p>
          </section>

          {listing.amenities.length > 0 && (
            <section>
              <h2 className="section-title mb-3">Équipements</h2>
              <div className="flex flex-wrap gap-2">
                {listing.amenities.map((a) => (
                  <span key={a} className="rounded-full bg-canvas px-3 py-1 text-sm capitalize text-ink/80">
                    {a}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="section-title mb-2">Emplacement</h2>
            <p className="mb-3 text-sm text-muted">
              {listing.city} ({listing.postalCode}). L&apos;adresse exacte est communiquée après
              confirmation de la réservation.
            </p>
            <div className="relative aspect-[16/8] overflow-hidden rounded-lg border border-line bg-canvas">
              <iframe
                title={`Carte de ${listing.city}`}
                loading="lazy"
                className="pointer-events-none h-full w-full"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${listing.longitude - 0.012},${listing.latitude - 0.006},${listing.longitude + 0.012},${listing.latitude + 0.006}&layer=mapnik`}
              />
              <span className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-brand/50 bg-brand/15" />
            </div>
          </section>

          <section>
            <h2 className="section-title mb-2">Conditions</h2>
            <p className="text-sm text-muted">
              Annulation : <span className="font-semibold text-ink">
                {CANCELLATION_LABEL[listing.cancellationPolicy] ?? listing.cancellationPolicy}
              </span>
              {' · '}
              <Link href="/legal/cancellation" className="font-semibold text-brand-fg">
                détails
              </Link>
            </p>
          </section>

          {reviews && reviews.total > 0 && (
            <section>
              <h2 className="section-title mb-3">
                ★ {rating?.toFixed(1)} · {reviews.total} avis
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.reviews.slice(0, 6).map((r) => (
                  <div key={r.id} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={r.author ? `${r.author.firstName} ${r.author.lastName}` : '?'}
                        size={30}
                      />
                      <div className="text-sm">
                        <span className="font-semibold">
                          {r.author ? `${r.author.firstName} ${r.author.lastName}` : 'Anonyme'}
                        </span>
                        <span className="text-muted"> · ★ {r.rating}</span>
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-sm leading-relaxed text-ink/80">{r.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Colonne latérale */}
        <div>
          <div className="card sticky top-20 space-y-4 p-4 shadow-raised">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xl font-extrabold">{listing.basePrice} €</span>
                <span className="text-sm text-muted"> / {unit}</span>
              </div>
              {rating !== null && (
                <span className="text-sm font-semibold">★ {rating.toFixed(1)}</span>
              )}
            </div>

            {isOwner ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted">Statut</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      LISTING_STATUS_CLASS[listing.status] ?? 'bg-canvas text-muted'
                    }`}
                  >
                    {LISTING_STATUS_LABEL[listing.status] ?? listing.status}
                  </span>
                </div>
                {!paymentsReady && (
                  <p className="rounded-md bg-warn-tint px-3 py-2 text-xs text-warn-fg">
                    Vos versements ne sont pas activés — les locataires ne peuvent pas réserver.{' '}
                    <Link href="/host" className="font-semibold underline">
                      Configurer
                    </Link>
                  </p>
                )}
                <Link href={`/listings/${listing.id}/edit`} className="btn-ghost w-full">
                  Photos & médias
                </Link>
                <Link href={`/listings/${listing.id}/calendar`} className="btn-ghost w-full">
                  Calendrier
                </Link>
                {listing.status !== 'ARCHIVED' && (
                  <button onClick={toggleStatus} disabled={statusBusy} className="btn-primary w-full">
                    {statusBusy
                      ? '…'
                      : listing.status === 'PUBLISHED'
                        ? 'Dépublier'
                        : 'Publier'}
                  </button>
                )}
              </div>
            ) : (
              <>
                {!paymentsReady && (
                  <p className="rounded-md bg-warn-tint px-3 py-2 text-xs text-warn-fg">
                    Cet hôte n&apos;a pas encore activé les paiements. Réservation bientôt disponible.
                  </p>
                )}

                <form onSubmit={handleBook} className="space-y-3">
                  <div>
                    <label className="label">Dates</label>
                    <DateRangePicker listingId={listing.id} value={range} onChange={setRange} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
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
                    <div>
                      <label className="label">Arrivée</label>
                      <input
                        type="time"
                        value={bookingForm.arrivalTime}
                        onChange={(e) => setBookingForm((f) => ({ ...f, arrivalTime: e.target.value }))}
                        className="field"
                      />
                    </div>
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

                  {quoting && <Skeleton className="h-24 w-full" />}
                  {quote && !quoting && (
                    <div className="rounded-md bg-canvas p-3">
                      <PriceBreakdown quote={quote} />
                    </div>
                  )}

                  {bookingError && <p className="text-xs text-danger-fg">{bookingError}</p>}
                  <button
                    type="submit"
                    disabled={bookingLoading || !paymentsReady || !range?.endDate}
                    className="btn-primary btn-lg w-full"
                  >
                    {bookingLoading
                      ? 'Réservation…'
                      : !paymentsReady
                        ? 'Indisponible'
                        : quote
                          ? `Réserver · ${eur(quote.totalAmount)}`
                          : 'Réserver'}
                  </button>
                  <p className="text-center text-[11px] text-muted">
                    Vous ne serez débité qu&apos;après confirmation.
                  </p>
                </form>

                <button onClick={handleContact} className="btn-ghost w-full">
                  Contacter l&apos;hôte
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/80 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

function ListingSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="aspect-[2/1] w-full rounded-lg" />
      <div className="grid gap-8 md:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    </div>
  );
}
