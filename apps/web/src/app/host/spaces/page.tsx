'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import VerificationBadge from '@/components/verification-badge';
import { EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { useConfirm } from '@/components/confirm';
import { useToast } from '@/components/toast';
import { eurRound } from '@/lib/format';
import { LISTING_STATUS_CLASS, LISTING_STATUS_LABEL, typeLabel, UNIT_LABEL_SHORT } from '@/lib/listing';
import { useHostGuard } from '../use-host-guard';
import type { Listing } from '@/lib/types';

export default function HostSpacesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HostSpaces />
    </Suspense>
  );
}

/** Menu « ⋯ » par ligne, façon SpaceRowMenu du prototype. */
function SpaceRowMenu({
  listing,
  open,
  onToggle,
  busy,
  onArchive,
  onTogglePublish,
}: {
  listing: Listing;
  open: boolean;
  onToggle: () => void;
  busy: boolean;
  onArchive: () => void;
  onTogglePublish: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onToggle();
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="rounded-md border border-line px-2.5 py-1.5 text-sm leading-none text-ink hover:border-ink/30"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-10 w-56 overflow-hidden rounded-md border border-line bg-surface shadow-modal">
          <Link
            href={`/listings/${listing.id}`}
            className="block px-3.5 py-2.5 text-[13px] text-ink hover:bg-canvas"
          >
            Voir l&apos;annonce
          </Link>
          <Link
            href={`/listings/${listing.id}/edit`}
            className="block px-3.5 py-2.5 text-[13px] text-ink hover:bg-canvas"
          >
            Gérer la fiche
          </Link>
          <Link
            href={`/listings/${listing.id}/calendar`}
            className="block px-3.5 py-2.5 text-[13px] text-ink hover:bg-canvas"
          >
            Modifier les disponibilités
          </Link>
          {listing.status !== 'ARCHIVED' && (
            <button
              type="button"
              disabled={busy}
              onClick={onTogglePublish}
              className="block w-full px-3.5 py-2.5 text-left text-[13px] text-ink hover:bg-canvas"
            >
              {listing.status === 'PUBLISHED' ? 'Dépublier' : 'Publier'}
            </button>
          )}
          {listing.status !== 'ARCHIVED' && (
            <button
              type="button"
              disabled={busy}
              onClick={onArchive}
              className="block w-full border-t border-line px-3.5 py-2.5 text-left text-[13px] text-danger-fg hover:bg-danger-tint"
            >
              Désactiver l&apos;espace
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function HostSpaces() {
  const { ready } = useHostGuard();
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const searchParams = useSearchParams();
  const createdId = searchParams.get('created');

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setListings(await api.listings.mine().catch(() => [] as Listing[]));
  }, []);

  useEffect(() => {
    if (!ready) return;
    load().finally(() => setLoading(false));
  }, [ready, load]);

  useEffect(() => {
    if (!createdId || listings.length === 0) return;
    toast.info('Annonce en brouillon — publiez-la pour la rendre visible');
    router.replace('/host/spaces');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createdId, listings.length]);

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

  // Regroupe par adresse, comme HostSpaces du prototype (plusieurs espaces
  // au même endroit — ex. fiches créées par un commercial pour un même lieu).
  const groups = useMemo(() => {
    const m = new Map<string, Listing[]>();
    for (const l of listings) {
      const key = `${l.addressLine1}, ${l.city}`;
      m.set(key, [...(m.get(key) ?? []), l]);
    }
    return m;
  }, [listings]);

  if (!ready || loading) return <PageLoader />;

  return (
    <div>
      <PageHeader
        title="Tous mes espaces"
        action={
          <Link href="/listings/new" className="btn-primary">
            + Nouvel espace
          </Link>
        }
      />

      {error && <p className="mt-3 text-sm text-danger-fg">{error}</p>}

      {listings.length === 0 ? (
        <EmptyState
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
        Array.from(groups.entries()).map(([address, group]) => (
          <div key={address} className="mt-6 first:mt-5">
            <div className="mb-2.5 text-[13px] text-muted">{address}</div>
            <div className="rounded-lg border border-line">
              <div className="flex items-center gap-2 rounded-t-lg border-b border-line bg-canvas px-4 py-2.5 text-xs font-medium text-muted">
                <div className="flex-[1.4]">Espace</div>
                <div className="hidden flex-1 sm:block">Type</div>
                <div className="hidden flex-1 sm:block">Capacité</div>
                <div className="flex-1">Prix</div>
                <div className="flex-1">Statut</div>
                <div className="w-10" />
              </div>
              {group.map((l, i) => {
                const isBusy = busyId === l.id;
                return (
                  <div
                    key={l.id}
                    id={`listing-${l.id}`}
                    className={`flex items-center gap-2 px-4 py-3.5 ${
                      i > 0 ? 'border-t border-line' : ''
                    } ${i === group.length - 1 ? 'rounded-b-lg' : ''} ${createdId === l.id ? 'bg-brand-tint/40' : ''}`}
                  >
                    <div className="flex-[1.4] truncate text-sm font-medium">{l.title}</div>
                    <div className="hidden flex-1 text-[13px] text-muted sm:block">
                      {typeLabel(l.type)}
                    </div>
                    <div className="hidden flex-1 text-[13px] text-muted sm:block">
                      {l.maxGuests != null ? `${l.maxGuests} pers.` : '—'}
                    </div>
                    <div className="flex-1 text-[13px]">
                      {eurRound(l.basePrice)} / {UNIT_LABEL_SHORT[l.pricingUnit] ?? ''}
                    </div>
                    <div className="flex-1">
                      {l.status === 'PENDING_VALIDATION' ? (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${LISTING_STATUS_CLASS.PENDING_VALIDATION}`}
                        >
                          {LISTING_STATUS_LABEL.PENDING_VALIDATION}
                        </span>
                      ) : (
                        <VerificationBadge verifiedAt={l.verifiedAt} showPending />
                      )}
                      {(l.status === 'DRAFT' || l.status === 'ARCHIVED') && (
                        <span className="ml-1.5 text-xs text-muted">
                          · {LISTING_STATUS_LABEL[l.status]}
                        </span>
                      )}
                    </div>
                    <div className="flex w-10 justify-end">
                      <SpaceRowMenu
                        listing={l}
                        open={openId === l.id}
                        onToggle={() => setOpenId(openId === l.id ? null : l.id)}
                        busy={isBusy}
                        onTogglePublish={() => {
                          setOpenId(null);
                          run(l.id, () =>
                            api.listings.setStatus(l.id, l.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED'),
                          );
                        }}
                        onArchive={async () => {
                          setOpenId(null);
                          const ok = await confirm({
                            title: 'Désactiver cet espace ?',
                            body: 'Il ne sera plus visible ni réservable. Les réservations en cours ne sont pas affectées.',
                            confirmLabel: 'Désactiver',
                            danger: true,
                          });
                          if (ok) run(l.id, () => api.listings.archive(l.id));
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
