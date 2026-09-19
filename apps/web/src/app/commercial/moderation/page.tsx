'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { canModerate, isAuthenticated, loginHref } from '@/lib/auth';
import { useConfirm } from '@/components/confirm';
import { useToast } from '@/components/toast';
import { EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { LISTING_STATUS_CLASS, LISTING_STATUS_LABEL, typeLabel } from '@/lib/listing';
import type { Listing } from '@/lib/types';

export default function ModerationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const confirm = useConfirm();
  const toast = useToast();

  const [ready, setReady] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    return api.listings
      .moderationList()
      .then(setListings)
      .catch(() => setListings([]));
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(loginHref(pathname));
      return;
    }
    api.auth
      .me()
      .then((me) => {
        if (!canModerate(me)) {
          router.replace('/');
          return;
        }
        setReady(true);
        return load();
      })
      .catch(() => router.replace(loginHref(pathname)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return listings;
    return listings.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        `${l.host?.firstName ?? ''} ${l.host?.lastName ?? ''}`.toLowerCase().includes(q),
    );
  }, [listings, query]);

  async function handleArchive(l: Listing) {
    const ok = await confirm({
      title: 'Archiver cette annonce ?',
      body: 'Elle ne sera plus visible ni réservable. Réversible uniquement en base — préférez ceci à la suppression définitive si un doute existe.',
      confirmLabel: 'Archiver',
      danger: true,
    });
    if (!ok) return;
    setBusyId(l.id);
    try {
      await api.listings.archive(l.id);
      toast.success('Annonce archivée');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(l: Listing) {
    const ok = await confirm({
      title: 'Supprimer définitivement cette annonce ?',
      body: "Action irréversible. Impossible si l'annonce a des réservations, messages ou une invitation liés — dans ce cas, archivez-la plutôt.",
      confirmLabel: 'Supprimer définitivement',
      danger: true,
    });
    if (!ok) return;
    setBusyId(l.id);
    try {
      await api.listings.deletePermanently(l.id);
      toast.success('Annonce supprimée définitivement');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible');
    } finally {
      setBusyId(null);
    }
  }

  if (!ready || loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        title="Modération"
        subtitle="Toutes les annonces, tous hôtes confondus — modifier, dépublier ou supprimer pour des soucis de contenu."
      />

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher par titre, ville ou hôte…"
        className="field max-w-md"
      />

      <p className="text-sm text-muted">
        {filtered.length} annonce{filtered.length !== 1 ? 's' : ''}
      </p>

      {filtered.length === 0 ? (
        <EmptyState icon="🔍" title="Aucune annonce trouvée" />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((l) => {
            const isBusy = busyId === l.id;
            return (
              <div key={l.id} className="card flex flex-wrap items-center gap-3 p-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{l.title}</p>
                  <p className="text-xs text-muted">
                    {typeLabel(l.type)} · {l.city} · {l.host ? `${l.host.firstName} ${l.host.lastName}` : 'hôte inconnu'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    LISTING_STATUS_CLASS[l.status] ?? 'bg-canvas text-muted'
                  }`}
                >
                  {LISTING_STATUS_LABEL[l.status] ?? l.status}
                </span>
                <Link href={`/listings/${l.id}/edit`} className="btn-ghost px-3 py-2 text-[13px]">
                  Modifier
                </Link>
                {l.status !== 'ARCHIVED' && (
                  <button
                    disabled={isBusy}
                    onClick={() => handleArchive(l)}
                    className="btn-ghost px-3 py-2 text-[13px]"
                  >
                    Archiver
                  </button>
                )}
                <button
                  disabled={isBusy}
                  onClick={() => handleDelete(l)}
                  className="rounded px-3 py-2 text-[13px] font-semibold text-muted transition-colors hover:text-danger-fg"
                >
                  Supprimer
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
