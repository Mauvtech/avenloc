'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated, loginHref } from '@/lib/auth';
import CategoryIcon from '@/components/category-icon';
import Avatar from '@/components/avatar';
import ListingCard from '@/components/listing-card';
import { Breadcrumbs, Skeleton, StarRating, VerifiedBadge } from '@/components/ui';
import { useToast } from '@/components/toast';
import { eur, eurRound } from '@/lib/format';
import {
  ACCESS_METHOD_LABEL,
  amenityLabel,
  attributeLabel,
  CANCELLATION_DETAIL,
  CANCELLATION_LABEL,
  capacityNoun,
  LISTING_STATUS_CLASS,
  LISTING_STATUS_LABEL,
  typeLabel,
  UNIT_LABEL_SHORT,
} from '@/lib/listing';
import type { Listing, ReviewList, SearchResultItem, User } from '@/lib/types';

const attrValue = (v: unknown) =>
  typeof v === 'boolean' ? (v ? 'Oui' : 'Non') : v == null ? '—' : String(v);

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
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
  const cancellationDetail = CANCELLATION_DETAIL[listing.cancellationPolicy];
  const isOwner = !!me && me.id === listing.hostId;
  const paymentsReady = listing.hostPaymentsReady !== false;
  const photos = listing.photos;
  const rating = reviews?.averageRating ?? null;
  const host = listing.host;
  const memberSince = host?.createdAt
    ? new Date(host.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;
  const reserveLabel = listing.pricingUnit === 'HOUR' ? 'Choisir un créneau' : 'Réserver';

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20 md:pb-0">
      <Breadcrumbs items={[{ label: 'Espaces', href: '/' }, { label: listing.title }]} />

      {isOwner && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand/30 bg-brand-tint/60 px-4 py-3 text-sm">
          <span className="font-semibold text-brand-fg">Aperçu de votre annonce</span>
          <span className="text-muted">— ce que voient les locataires.</span>
          <Link href="/host" className="ml-auto font-semibold text-brand-fg">
            Gérer
          </Link>
        </div>
      )}

      {/* Galerie : 1 grande photo + grille de 4 miniatures */}
      {photos.length === 0 && (
        <div className="flex h-40 items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-canvas text-sm text-muted sm:h-56">
          <CategoryIcon type={listing.type} size={30} className="text-line" />
          Aucune photo pour cette annonce
        </div>
      )}
      {photos.length > 0 && (
        <div className="space-y-2">
          <button
            onClick={() => setLightbox(photos[0].url)}
            className="group block aspect-[16/8] w-full overflow-hidden rounded-lg bg-canvas"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[0].url}
              alt={listing.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </button>
          {photos.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {photos.slice(1, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setLightbox(p.url)}
                  className="group aspect-square overflow-hidden rounded-lg bg-canvas"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* En-tête */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-extrabold leading-tight sm:text-3xl">{listing.title}</h1>
          {host?.verified && <VerifiedBadge className="mt-1.5 flex-none" />}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <CategoryIcon type={listing.type} size={13} />
            {typeLabel(listing.type)}
          </span>
          <span aria-hidden>·</span>
          <span>{listing.instantBookEnabled ? '⚡ Réservation instantanée' : "Sur validation de l'hôte"}</span>
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
                    <div className="text-[11px] text-muted">{attributeLabel(key)}</div>
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
                  <span key={a} className="rounded-full bg-canvas px-3 py-1 text-sm text-ink/80">
                    {amenityLabel(a)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {listing.faq && listing.faq.length > 0 && (
            <section>
              <h2 className="section-title mb-3">Questions fréquentes</h2>
              <div className="divide-y divide-line">
                {listing.faq.map((item, i) => (
                  <details key={i} className="py-2.5">
                    <summary className="cursor-pointer text-sm font-semibold text-ink">
                      {item.question}
                    </summary>
                    <p className="mt-1.5 text-sm text-muted">{item.reponse}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {(listing.rcProRequired || listing.houseRules) && (
            <section>
              <h2 className="section-title mb-2">À prévoir avant de réserver</h2>
              <ul className="space-y-1 text-sm text-muted">
                {listing.rcProRequired && (
                  <li>• Une assurance responsabilité civile professionnelle (RC Pro) valide</li>
                )}
                {listing.houseRules && (
                  <li>• L&apos;acceptation du règlement intérieur de l&apos;espace</li>
                )}
              </ul>
              {listing.houseRules && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-semibold text-brand-fg">
                    Voir le règlement intérieur
                  </summary>
                  <p className="mt-1.5 whitespace-pre-wrap text-xs text-muted">{listing.houseRules}</p>
                </details>
              )}
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
            <h2 className="section-title mb-2">Conditions</h2>
            {listing.amenities.includes('parking') && (
              <p className="text-sm text-muted">
                Parking : <span className="font-semibold text-ink">Disponible sur place</span>
              </p>
            )}
            {listing.amenities.includes('pmr') && (
              <p className="mt-1 text-sm text-muted">
                Accessibilité : <span className="font-semibold text-ink">Accès PMR</span>
              </p>
            )}
            <p className="mt-1 text-sm text-muted">
              Méthode d&apos;accès :{' '}
              <span className="font-semibold text-ink">{ACCESS_METHOD_LABEL[listing.accessMethod] ?? listing.accessMethod}</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              Annulation : <span className="font-semibold text-ink">
                {CANCELLATION_LABEL[listing.cancellationPolicy] ?? listing.cancellationPolicy}
              </span>
              {' · '}
              <Link href="/legal/cancellation" className="font-semibold text-brand-fg">
                détails
              </Link>
            </p>
            {listing.depositAmount && Number(listing.depositAmount) > 0 && (
              <p className="mt-1 text-sm text-muted">
                Caution :{' '}
                <span className="font-semibold text-ink">{eur(listing.depositAmount)}</span> (empreinte
                bancaire, restituée après usage sauf réclamation justifiée)
              </p>
            )}
            {cancellationDetail && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs font-semibold text-brand-fg">
                  Détail no-show, retard et dépassement
                </summary>
                <div className="mt-2 space-y-1 text-xs text-muted">
                  <p>
                    <span className="font-semibold text-ink">No-show : </span>
                    {cancellationDetail.noShow}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Retard : </span>
                    {cancellationDetail.retard}
                  </p>
                  <p>
                    <span className="font-semibold text-ink">Dépassement : </span>
                    {cancellationDetail.depassement}
                  </p>
                </div>
              </details>
            )}
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
                        <div className="mt-0.5">
                          <StarRating value={r.rating} readOnly size={13} />
                        </div>
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

                <Link
                  href={paymentsReady ? `/listings/${listing.id}/reserve` : '#'}
                  aria-disabled={!paymentsReady}
                  className={`btn-primary btn-lg w-full ${!paymentsReady ? 'pointer-events-none opacity-50' : ''}`}
                >
                  {paymentsReady ? reserveLabel : 'Indisponible'}
                </Link>
                <p className="text-center text-[11px] text-muted">
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
            href={paymentsReady ? `/listings/${listing.id}/reserve` : '#'}
            className={`btn-primary ${!paymentsReady ? 'pointer-events-none opacity-50' : ''}`}
          >
            {paymentsReady ? reserveLabel : 'Indisponible'}
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
      <Skeleton className="h-4 w-40" />
      <Skeleton className="aspect-[16/8] w-full rounded-lg" />
      <Skeleton className="h-8 w-2/3" />
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
