'use client';

import ListingRating from '@/components/listing-rating';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import VerificationBadge from '@/components/verification-badge';
import Avatar from '@/components/avatar';
import ListingCard from '@/components/listing-card';
import { BackLink, Skeleton, StarRating } from '@/components/ui';
import { useToast } from '@/components/toast';
import { eurRound } from '@/lib/format';
import {
  ACCESS_METHOD_LABEL,
  capacityNoun,
  LISTING_STATUS_CLASS,
  LISTING_STATUS_LABEL,
  UNIT_LABEL_SHORT,
  WEEKDAY_LABEL,
} from '@/lib/listing';
import { cancellationPolicyDetail } from '@/lib/cancellation-policies';
import type { Listing, ReviewList, SearchResultItem, User } from '@/lib/types';

const attrValue = (v: unknown) =>
  typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : v == null ? '—' : String(v);
const humanize = (k: string) => k.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

/** Ligne label/valeur des « Informations pratiques », façon InfoRow du prototype. */
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex border-b border-line py-2.5 text-sm">
      <div className="w-[130px] shrink-0 text-muted">{label}</div>
      <div>{value}</div>
    </div>
  );
}

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();

  const [listing, setListing] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<ReviewList | null>(null);
  const [me, setMe] = useState<User | null>(null);
  const [similar, setSimilar] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
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
        api.listings
          .search(`type=${l.type}&limit=7`)
          .then((res) => setSimilar(res.listings.filter((x) => x.id !== l.id).slice(0, 3)))
          .catch(() => setSimilar([]));
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
        <div className="flex h-40 items-center justify-center rounded-lg bg-canvas text-sm text-muted sm:h-56">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold leading-tight">{listing.title}</h1>
          <VerificationBadge verifiedAt={listing.verifiedAt} />
        </div>
        <div className="flex flex-wrap items-center gap-5 text-sm text-muted">
          {listing.maxGuests != null && <span>{listing.maxGuests} {capacityNoun(listing.type)}</span>}
          <ListingRating rating={rating} count={reviews?.total} showCount />
          <span>{listing.city}</span>
        </div>
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

          <section>
            <h2 className="section-title mb-1.5">Informations pratiques</h2>
            <div>
              <InfoRow
                label="Horaires"
                value={`${listing.openDays.map((d) => WEEKDAY_LABEL[d]).join(', ')}, ${listing.openStartTime}–${listing.openEndTime}`}
              />
              <InfoRow
                label="Méthode d'accès"
                value={listing.accessMethod ? ACCESS_METHOD_LABEL[listing.accessMethod] ?? listing.accessMethod : null}
              />
              <InfoRow
                label="Politique d'annulation"
                value={cancellationPolicyDetail(listing.cancellationPolicy).label}
              />
              <InfoRow
                label="Caution"
                value={
                  listing.depositAmount
                    ? `${eurRound(listing.depositAmount)} (empreinte bancaire, restituée après usage)`
                    : 'Aucune'
                }
              />
              <InfoRow label="Assurance RC Pro" value={listing.rcProRequired ? 'Obligatoire' : 'Non requise'} />
              <InfoRow
                label="Validation de la demande"
                value={
                  listing.activityValidationRequired
                    ? "L'hôte valide chaque demande selon l'activité prévue"
                    : listing.instantBookEnabled
                      ? 'Réservation instantanée'
                      : "Sur validation de l'hôte"
                }
              />
            </div>

            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-ink">Détail no-show, retard et dépassement</summary>
              <div className="mt-2">
                <InfoRow label="No-show" value={cancellationPolicyDetail(listing.cancellationPolicy).noShow} />
                <InfoRow label="Retard" value={cancellationPolicyDetail(listing.cancellationPolicy).lateArrival} />
                <InfoRow label="Dépassement" value={cancellationPolicyDetail(listing.cancellationPolicy).overrun} />
              </div>
            </details>

            {listing.houseRules && (
              <details className="mt-4 text-sm">
                <summary className="cursor-pointer text-ink">Voir le règlement intérieur</summary>
                <p className="mt-2 whitespace-pre-wrap text-muted">{listing.houseRules}</p>
              </details>
            )}
          </section>

          {listing.faqItems && listing.faqItems.length > 0 && (
            <section>
              <h2 className="section-title mb-3">Questions fréquentes</h2>
              <div>
                {listing.faqItems.map((faq) => (
                  <details key={faq.id} className="border-b border-line py-2.5 text-sm">
                    <summary className="cursor-pointer text-ink">{faq.question}</summary>
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
                      <Avatar name={r.authorFirstName ?? '?'} size={30} />
                      <div className="text-sm">
                        <span className="font-semibold">{r.authorFirstName ?? 'Anonyme'}</span>
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
              <ListingRating rating={rating} count={reviews?.total} />
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
                {!paymentsReady ? (
                  <p className="rounded-md bg-warn-tint px-3 py-2 text-xs text-warn-fg">
                    Cet hôte n&apos;a pas encore activé les paiements. Réservation bientôt disponible.
                  </p>
                ) : (
                  <p className="text-sm text-muted">
                    {listing.instantBookEnabled ? 'Réservation instantanée disponible' : "Sur validation de l'hôte"}
                  </p>
                )}

                <Link
                  href={`/listings/${listing.id}/book`}
                  className={`btn-primary w-full ${!paymentsReady ? 'pointer-events-none opacity-50' : ''}`}
                >
                  Choisir un créneau
                </Link>

                <p className="text-center text-xs text-muted">
                  La messagerie avec l&apos;hôte s&apos;active après le paiement de votre réservation.
                </p>
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
          <Link
            href={`/listings/${listing.id}/book`}
            className={`btn-primary ${!paymentsReady ? 'pointer-events-none opacity-50' : ''}`}
          >
            {paymentsReady ? 'Choisir un créneau' : 'Indisponible'}
          </Link>
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
