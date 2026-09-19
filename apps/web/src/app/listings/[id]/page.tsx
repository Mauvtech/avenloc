'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated, loginHref, registerHref } from '@/lib/auth';
import VerificationBadge from '@/components/verification-badge';
import CategoryIcon from '@/components/category-icon';
import SlotPicker, { type SlotSelection } from '@/components/slot-picker';
import PriceBreakdown from '@/components/price-breakdown';
import Avatar from '@/components/avatar';
import ListingCard from '@/components/listing-card';
import { BackLink, Skeleton, StarRating } from '@/components/ui';
import { useToast } from '@/components/toast';
import { eur, eurRound } from '@/lib/format';
import {
  ACCESS_METHOD_LABEL,
  capacityNoun,
  LISTING_STATUS_CLASS,
  LISTING_STATUS_LABEL,
  typeLabel,
  UNIT_LABEL_SHORT,
  WEEKDAY_LABEL,
} from '@/lib/listing';
import { cancellationPolicyDetail } from '@/lib/cancellation-policies';
import type { Listing, Quote, ReviewList, SearchResultItem, User } from '@/lib/types';

const attrValue = (v: unknown) =>
  typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : v == null ? '—' : String(v);
const humanize = (k: string) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();

  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<ReviewList | null>(null);
  const [me, setMe] = useState<User | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [similar, setSimilar] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [slot, setSlot] = useState<SlotSelection | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    guestCount: '1',
    arrivalTime: '',
    guestNote: '',
    activityDescription: '',
    rcProAccepted: false,
    houseRulesAccepted: false,
  });
  const [showHouseRules, setShowHouseRules] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
    Promise.all([
      api.listings.getById(id),
      api.reviews.byListing(id),
      isAuthenticated() ? api.auth.me().catch(() => null) : Promise.resolve(null),
    ])
      .then(([l, r, u]) => {
        setListing(l);
        setReviews(r);
        setMe(u);
        api.listings
          .search(`type=${l.type}&limit=7`)
          .then((res) => setSimilar(res.listings.filter((x) => x.id !== l.id).slice(0, 3)))
          .catch(() => setSimilar([]));

        // Restaure la sélection en cours si l'utilisateur revient d'une
        // connexion/inscription déclenchée depuis cette même annonce.
        try {
          const raw = sessionStorage.getItem(`aven:draft:${id}`);
          if (raw) {
            const draft = JSON.parse(raw) as {
              slot?: typeof slot;
              bookingForm?: typeof bookingForm;
            };
            if (draft.slot) setSlot(draft.slot);
            if (draft.bookingForm) setBookingForm(draft.bookingForm);
            sessionStorage.removeItem(`aven:draft:${id}`);
          }
        } catch {
          /* ignore */
        }
      })
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false));
  }, [id, router]);

  // Fermeture de la lightbox au clavier.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLightbox(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);

  // Devis live dès qu'un créneau est choisi.
  useEffect(() => {
    if (!slot) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    api.bookings
      .quote({ listingId: id, date: slot.date, startTime: slot.startTime, endTime: slot.endTime })
      .then((q) => !cancelled && setQuote(q))
      .catch(() => !cancelled && setQuote(null))
      .finally(() => !cancelled && setQuoting(false));
    return () => {
      cancelled = true;
    };
  }, [slot, id]);

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated()) return router.push(loginHref(pathname));
    if (!slot) {
      setBookingError('Choisissez un créneau.');
      return;
    }
    if (!bookingForm.houseRulesAccepted) {
      setBookingError("Merci d'accepter le règlement intérieur de l'annonce.");
      return;
    }
    setBookingError(null);
    setBookingLoading(true);
    try {
      const booking = await api.bookings.create({
        listingId: id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        guestCount: parseInt(bookingForm.guestCount, 10),
        arrivalTime: bookingForm.arrivalTime || undefined,
        guestNote: bookingForm.guestNote || undefined,
        activityDescription: bookingForm.activityDescription || undefined,
        rcProAccepted: bookingForm.rcProAccepted,
        houseRulesAccepted: bookingForm.houseRulesAccepted,
      });
      router.push(`/bookings/${booking.id}`);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Erreur lors de la réservation');
    } finally {
      setBookingLoading(false);
    }
  }

  function saveDraft() {
    try {
      sessionStorage.setItem(`aven:draft:${id}`, JSON.stringify({ slot, bookingForm }));
    } catch {
      /* ignore */
    }
  }

  async function handleContact() {
    if (!isAuthenticated()) return router.push(loginHref(pathname));
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
    <div className="space-y-5 pb-20 md:pb-0">
      <BackLink href="/">Retour aux annonces</BackLink>

      {isOwner && listing.status === 'PENDING_VALIDATION' && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-warn/30 bg-warn-tint px-4 py-3 text-sm">
          <span className="font-semibold text-warn-fg">Fiche à valider</span>
          <span className="text-muted">
            — cette annonce a été préparée par notre équipe commerciale. Relisez-la et publiez-la
            quand elle vous convient.
          </span>
          <Link href={`/listings/${listing.id}/edit`} className="ml-auto font-semibold text-warn-fg">
            Relire &amp; compléter
          </Link>
        </div>
      )}

      {isOwner && listing.status !== 'PENDING_VALIDATION' && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand-tint/60 px-4 py-3 text-sm">
          <span className="font-semibold text-brand-fg">Aperçu de votre annonce</span>
          <span className="text-muted">— ce que voient les locataires.</span>
          <Link href="/host" className="ml-auto font-semibold text-brand-fg">
            Gérer
          </Link>
        </div>
      )}

      <div className="marketplace-detail">
        {/* Colonne principale */}
        <div className="space-y-7">
      {/* Galerie */}
      {photos.length === 0 && (
        <div className="flex h-40 items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-canvas text-sm text-muted sm:h-56">
          <CategoryIcon type={listing.type} size={30} className="text-line" />
          Aucune photo pour cette annonce
        </div>
      )}
      {photos.length > 0 && (
        <div>
          <button onClick={() => setLightbox(photos[0].url)} className="block aspect-[16/8] w-full overflow-hidden rounded bg-canvas" aria-label="Agrandir la photo principale">
            <img src={photos[0].url} alt={listing.title} className="h-full w-full object-cover" />
          </button>
          <div className="mt-2 grid grid-cols-2 gap-2 min-[641px]:grid-cols-4">
            {photos.map((photo, i) => <button key={photo.id} onClick={() => setLightbox(photo.url)} aria-label={`Agrandir la photo ${i+1}`} className="aspect-[4/3] overflow-hidden rounded bg-canvas"><img src={photo.url} alt={`${listing.title}, vue ${i+1}`} className="h-full w-full object-cover" /></button>)}
          </div>
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{listing.title}</h1>
          <VerificationBadge verifiedAt={listing.verifiedAt} />
        </div>
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
                  {listing.maxGuests} {capacityNoun(listing.type)} max
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
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="section-title">Emplacement</h2>
              <a
                href={`https://www.openstreetmap.org/?mlat=${listing.latitude}&mlon=${listing.longitude}#map=15/${listing.latitude}/${listing.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-brand-fg hover:underline"
              >
                Voir en grand ↗
              </a>
            </div>
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

          <section className="space-y-3">
            <h2 className="section-title mb-2">Conditions</h2>
            <div className="rounded-md border border-line p-3.5 text-sm">
              <p className="font-semibold text-ink">
                Annulation {cancellationPolicyDetail(listing.cancellationPolicy).label}
              </p>
              <p className="mt-1 text-muted">{cancellationPolicyDetail(listing.cancellationPolicy).refund}</p>
              <dl className="mt-3 space-y-1.5 text-xs text-muted">
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-semibold text-ink">No-show</dt>
                  <dd>{cancellationPolicyDetail(listing.cancellationPolicy).noShow}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-semibold text-ink">Retard</dt>
                  <dd>{cancellationPolicyDetail(listing.cancellationPolicy).lateArrival}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 font-semibold text-ink">Dépassement</dt>
                  <dd>{cancellationPolicyDetail(listing.cancellationPolicy).overrun}</dd>
                </div>
              </dl>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {listing.accessMethod && (
                <span className="badge">🔑 {ACCESS_METHOD_LABEL[listing.accessMethod] ?? listing.accessMethod}</span>
              )}
              {listing.rcProRequired && <span className="badge">Attestation RC Pro requise</span>}
              {listing.activityValidationRequired && (
                <span className="badge">Activité validée par l&apos;hôte</span>
              )}
              {listing.depositAmount && <span className="badge">Caution {eurRound(listing.depositAmount)}</span>}
            </div>

            <p className="text-xs text-muted">
              Ouvert {listing.openDays.map((d) => WEEKDAY_LABEL[d]).join(', ')} de {listing.openStartTime} à{' '}
              {listing.openEndTime} · durée minimale {listing.minDurationMinutes} min
              {listing.minNoticeHours > 0 && ` · réservation au moins ${listing.minNoticeHours}h à l'avance`}.
            </p>

            {listing.houseRules && (
              <details className="rounded-md border border-line p-3 text-sm">
                <summary className="cursor-pointer font-semibold text-ink">Règlement intérieur</summary>
                <p className="mt-2 whitespace-pre-wrap text-muted">{listing.houseRules}</p>
              </details>
            )}
          </section>

          {listing.faqItems && listing.faqItems.length > 0 && (
            <section>
              <h2 className="section-title mb-3">Questions fréquentes</h2>
              <div className="space-y-2">
                {listing.faqItems.map((faq) => (
                  <details key={faq.id} className="rounded-md border border-line p-3 text-sm">
                    <summary className="cursor-pointer font-semibold text-ink">{faq.question}</summary>
                    <p className="mt-2 text-muted">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

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
                        <div className="mt-0.5">
                          <StarRating value={r.rating} readOnly size={13} />
                        </div>
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-sm leading-relaxed text-ink/80">{r.comment}</p>
                    )}
                    {r.criteria && <p className="text-xs text-muted">Critères évalués : {r.criteria}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Colonne latérale */}
        <div>
          <div className="card sticky top-5 space-y-4 p-[22px]">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xl font-extrabold">{eurRound(listing.basePrice)}</span>
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
                    Vos encaissements ne sont pas activés — les locataires ne peuvent pas réserver.{' '}
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

                <form id="booking" onSubmit={handleBook} className="scroll-mt-20 space-y-3">
                  <div>
                    <label className="label">Créneau</label>
                    <SlotPicker listingId={listing.id} value={slot} onChange={setSlot} />
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

                  {listing.activityValidationRequired && (
                    <div>
                      <label className="label">Activité prévue</label>
                      <textarea
                        rows={2}
                        required
                        placeholder="Décrivez l'activité prévue pour ce créneau — l'hôte doit la valider."
                        value={bookingForm.activityDescription}
                        onChange={(e) =>
                          setBookingForm((f) => ({ ...f, activityDescription: e.target.value }))
                        }
                        className="field resize-y"
                      />
                    </div>
                  )}

                  {listing.rcProRequired && (
                    <label className="flex items-start gap-2 text-xs text-ink/80">
                      <input
                        type="checkbox"
                        required
                        checked={bookingForm.rcProAccepted}
                        onChange={(e) =>
                          setBookingForm((f) => ({ ...f, rcProAccepted: e.target.checked }))
                        }
                        className="mt-0.5"
                      />
                      Je certifie disposer d&apos;une attestation d&apos;assurance responsabilité civile
                      professionnelle en cours de validité.
                    </label>
                  )}

                  <label className="flex items-start gap-2 text-xs text-ink/80">
                    <input
                      type="checkbox"
                      required
                      checked={bookingForm.houseRulesAccepted}
                      onChange={(e) =>
                        setBookingForm((f) => ({ ...f, houseRulesAccepted: e.target.checked }))
                      }
                      className="mt-0.5"
                    />
                    J&apos;accepte le{' '}
                    {listing.houseRules ? (
                      <button
                        type="button"
                        onClick={() => setShowHouseRules((v) => !v)}
                        className="font-semibold text-brand-fg underline"
                      >
                        règlement intérieur
                      </button>
                    ) : (
                      'règlement intérieur'
                    )}{' '}
                    de l&apos;annonce.
                  </label>
                  {showHouseRules && listing.houseRules && (
                    <p className="rounded-md bg-canvas p-3 text-xs text-muted">{listing.houseRules}</p>
                  )}

                  {quoting && <Skeleton className="h-24 w-full" />}
                  {quote && !quoting && (
                    <div className="rounded-md bg-canvas p-3">
                      <PriceBreakdown quote={quote} />
                    </div>
                  )}

                  {bookingError && <p className="text-xs text-danger-fg">{bookingError}</p>}

                  {loggedIn ? (
                    <>
                      <button
                        type="submit"
                        disabled={bookingLoading || !paymentsReady || !slot}
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
                    </>
                  ) : (
                    <div className="rounded-md border border-brand/25 bg-brand-tint/40 p-3.5 text-center">
                      <p className="text-sm font-semibold text-ink">Connectez-vous pour réserver</p>
                      <p className="mt-1 text-xs text-muted">
                        Créez un compte ou connectez-vous pour finaliser cette réservation et
                        contacter l&apos;hôte. Vos dates et informations restent enregistrées ici.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <Link
                          href={loginHref(pathname)}
                          onClick={saveDraft}
                          className="btn-primary flex-1 justify-center"
                        >
                          Se connecter
                        </Link>
                        <Link
                          href={registerHref(pathname)}
                          onClick={saveDraft}
                          className="btn-ghost flex-1 justify-center"
                        >
                          Créer un compte
                        </Link>
                      </div>
                    </div>
                  )}
                </form>

                {loggedIn && (
                  <button onClick={handleContact} className="btn-ghost w-full">
                    Contacter l&apos;hôte
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Espaces similaires */}
      {similar.length > 0 && (
        <section className="border-t border-line pt-8">
          <h2 className="section-title mb-3">Espaces similaires</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {similar.map((s) => (
              <ListingCard key={s.id} listing={s} />
            ))}
          </div>
        </section>
      )}

      {/* Barre d'action mobile */}
      {!isOwner && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur md:hidden">
          <div className="text-sm">
            <span className="font-extrabold">{eurRound(listing.basePrice)}</span>
            <span className="text-muted"> / {unit}</span>
          </div>
          <a
            href="#booking"
            className={`btn-primary ${!paymentsReady ? 'pointer-events-none opacity-50' : ''}`}
          >
            {paymentsReady ? 'Réserver' : 'Indisponible'}
          </a>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo en plein écran"
          className="fixed inset-0 z-[150] flex items-center justify-center bg-ink/80 p-4"
        >
          <button
            onClick={() => setLightbox(null)}
            aria-label="Fermer"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-lg text-ink hover:bg-surface"
          >
            ✕
          </button>
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
