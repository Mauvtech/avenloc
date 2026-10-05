'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated, loginHref } from '@/lib/auth';
import { EmptyState, PageHeader, Skeleton } from '@/components/ui';
import { dateShort, eur, timeLabel } from '@/lib/format';
import type { Booking } from '@/lib/types';

type Tab = 'upcoming' | 'ongoing' | 'past';

const PILL: Record<Tab, string> = {
  upcoming: 'bg-brand-tint text-brand-fg',
  ongoing: 'bg-success-tint text-success-fg',
  past: 'bg-canvas text-muted',
};

const PILL_LABEL: Record<Tab, string> = {
  upcoming: 'à venir',
  ongoing: 'en cours',
  past: 'passée',
};

function categorize(b: Booking, nowTs: number): Tab {
  const startTs = new Date(b.startAt).getTime();
  const endTs = new Date(b.endAt).getTime();
  if (b.status === 'CONFIRMED' && startTs > nowTs) return 'upcoming';
  if (b.status === 'CONFIRMED' && startTs <= nowTs && endTs >= nowTs) return 'ongoing';
  return 'past';
}

export default function BookingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [tab, setTab] = useState<Tab>('upcoming');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(loginHref(pathname));
      return;
    }
    api.bookings.mine().then(setBookings).catch(() => setBookings([]));
  }, [router, pathname]);

  const nowTs = Date.now();
  const filtered = useMemo(() => {
    if (!bookings) return [];
    return bookings
      .filter((b) => categorize(b, nowTs) === tab)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [bookings, tab, nowTs]);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Mes réservations" />

      <div className="auth-tabs">
        {(['upcoming', 'ongoing', 'past'] as Tab[]).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`auth-tab capitalize ${tab === key ? 'auth-tab-active' : ''}`}
          >
            {PILL_LABEL[key]}
          </button>
        ))}
      </div>

      {bookings === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          title="Aucune réservation"
          action={
            <Link href="/" className="btn-primary">
              Trouver un espace
            </Link>
          }
        >
          Vos réservations à venir et passées apparaîtront ici.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <p className="text-[13px] text-muted">Aucune réservation {PILL_LABEL[tab]}.</p>
      ) : (
        <div>
          {filtered.map((b) => (
            <div key={b.id} className="mb-3 rounded-lg border border-line p-4.5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[15px] font-semibold">{b.listing?.title ?? 'Annonce'}</div>
                  {b.listing?.city && <div className="mt-0.5 text-[13px] text-muted">{b.listing.city}</div>}
                  <div className="mt-1.5 text-[13px]">
                    {dateShort(b.startAt)} · {timeLabel(b.startAt)}–{timeLabel(b.endAt)}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${PILL[tab]}`}>
                    {PILL_LABEL[tab]}
                  </span>
                  <div className="mt-2 text-sm font-semibold">{eur(b.totalAmount)}</div>
                </div>
              </div>

              {tab === 'upcoming' && (
                <p className="mt-2.5 text-xs text-muted">Rappel automatique prévu 24h avant l&apos;arrivée.</p>
              )}

              <div className="mt-3.5 flex flex-wrap gap-2.5">
                {tab === 'upcoming' && (
                  <Link href={`/bookings/${b.id}`} className="btn-ghost btn-sm">
                    Voir les instructions d&apos;accès
                  </Link>
                )}
                {tab === 'ongoing' && (
                  <Link href={`/bookings/${b.id}`} className="btn-ghost btn-sm">
                    Voir les instructions d&apos;accès
                  </Link>
                )}
                {tab === 'past' && (
                  <Link href={`/bookings/${b.id}#review`} className="btn-ghost btn-sm">
                    Laisser un avis
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
