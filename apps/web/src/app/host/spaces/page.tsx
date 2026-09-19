'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import VerificationBadge from '@/components/verification-badge';
import CategoryIcon from '@/components/category-icon';
import { EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { useConfirm } from '@/components/confirm';
import { useToast } from '@/components/toast';
import { eurRound } from '@/lib/format';
import { LISTING_STATUS_CLASS, LISTING_STATUS_LABEL, typeLabel, UNIT_LABEL_SHORT } from '@/lib/listing';
import { fmtEUR, netAmount } from '@/lib/host-stats';
import { useHostGuard } from '../use-host-guard';
import type { Booking, Listing } from '@/lib/types';

export default function HostSpacesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HostSpaces />
    </Suspense>
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
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [ls, bs] = await Promise.all([
      api.listings.mine().catch(() => [] as Listing[]),
      api.bookings.asHost().catch(() => [] as Booking[]),
    ]);
    setListings(ls);
    setBookings(bs);
  }, []);

  useEffect(() => {
    if (!ready) return;
    load().finally(() => setLoading(false));
  }, [ready, load]);

  useEffect(() => {
    if (!createdId || listings.length === 0) return;
    const el = document.getElementById(`listing-${createdId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.info('Annonce en brouillon — publiez-la pour la rendre visible');
    }
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

  const revenueByListing = useMemo(() => {
    const m = new Map<string, { count: number; net: number }>();
    for (const b of bookings) {
      if (b.status !== 'CONFIRMED' && b.status !== 'COMPLETED') continue;
      const cur = m.get(b.listingId) ?? { count: 0, net: 0 };
      cur.count++;
      cur.net += netAmount(b);
      m.set(b.listingId, cur);
    }
    return m;
  }, [bookings]);

  // Regroupe par établissement (fiches créées via le module Commercial) quand présent.
  const groups = useMemo(() => {
    const m = new Map<string, Listing[]>();
    for (const l of listings) {
      const key = l.establishmentId ?? '__own__';
      m.set(key, [...(m.get(key) ?? []), l]);
    }
    return m;
  }, [listings]);

  if (!ready || loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mes espaces"
        action={
          <Link href="/listings/new" className="btn-primary">
            + Créer une annonce
          </Link>
        }
      />
      <p className="text-sm text-muted">
        {listings.filter((l) => l.status === 'PUBLISHED').length} publiée(s) / {listings.length}
      </p>

      {error && <p className="text-sm text-danger-fg">{error}</p>}

      {listings.length === 0 ? (
        <EmptyState
          icon="🏠"
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
        Array.from(groups.entries()).map(([key, group]) => (
          <div key={key} className="space-y-2.5">
            {key !== '__own__' && (
              <h2 className="text-sm font-bold text-muted">
                {group[0]?.establishmentId ? 'Établissement' : 'Mes annonces'}
              </h2>
            )}
            {group.map((l) => {
              const isBusy = busyId === l.id;
              const rev = revenueByListing.get(l.id);
              return (
                <div
                  key={l.id}
                  id={`listing-${l.id}`}
                  className={`card space-y-3 p-3.5 transition-shadow ${
                    createdId === l.id ? 'ring-2 ring-brand' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <CategoryIcon type={l.type} size={20} className="mt-0.5 flex-none text-brand-fg" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-bold">{l.title}</span><VerificationBadge verifiedAt={l.verifiedAt} /></div>
                      <div className="text-xs text-muted">
                        {typeLabel(l.type)}
                        {rev ? ` · ${rev.count} résa · ${fmtEUR(rev.net)}` : ' · aucune réservation'}
                      </div>
                    </div>
                    <div className="flex-none text-right text-sm font-semibold">
                      {eurRound(l.basePrice)}
                      <span className="font-normal text-muted">
                        /{UNIT_LABEL_SHORT[l.pricingUnit] ?? ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        LISTING_STATUS_CLASS[l.status] ?? 'bg-canvas text-muted'
                      }`}
                    >
                      {LISTING_STATUS_LABEL[l.status] ?? l.status}
                    </span>
                    <span className="flex-1" />
                    <Link href={`/listings/${l.id}`} className="btn-ghost px-3 py-2 text-[13px]">
                      Voir
                    </Link>
                    <Link href={`/listings/${l.id}/edit`} className="btn-ghost px-3 py-2 text-[13px]">
                      Modifier
                    </Link>
                    <Link href={`/listings/${l.id}/calendar`} className="btn-ghost px-3 py-2 text-[13px]">
                      Calendrier
                    </Link>
                    {l.status === 'DRAFT' && (
                      <button
                        disabled={isBusy}
                        onClick={() => run(l.id, () => api.listings.setStatus(l.id, 'PUBLISHED'))}
                        className="btn-primary px-3 py-2 text-[13px]"
                      >
                        Publier
                      </button>
                    )}
                    {l.status === 'PUBLISHED' && (
                      <button
                        disabled={isBusy}
                        onClick={() => run(l.id, () => api.listings.setStatus(l.id, 'DRAFT'))}
                        className="btn-ghost px-3 py-2 text-[13px]"
                      >
                        Dépublier
                      </button>
                    )}
                    {l.status !== 'ARCHIVED' && (
                      <button
                        disabled={isBusy}
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Archiver cette annonce ?',
                            body: 'Elle ne sera plus visible ni réservable. Les réservations en cours ne sont pas affectées.',
                            confirmLabel: 'Archiver',
                            danger: true,
                          });
                          if (ok) run(l.id, () => api.listings.archive(l.id));
                        }}
                        className="rounded px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:text-danger-fg"
                      >
                        Archiver
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
