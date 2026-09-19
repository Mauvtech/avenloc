'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import CategoryIcon from '@/components/category-icon';
import { PageHeader, PageLoader } from '@/components/ui';
import { dateShort, timeLabel } from '@/lib/format';
import { fmtEUR2, netAmount } from '@/lib/host-stats';
import { useHostGuard } from '../use-host-guard';
import type { Booking } from '@/lib/types';

const BK_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'En attente', cls: 'bg-warn-tint text-warn-fg' },
  CONFIRMED: { label: 'Confirmée', cls: 'bg-success-tint text-success-fg' },
  COMPLETED: { label: 'Terminée', cls: 'bg-canvas text-muted' },
  CANCELLED: { label: 'Annulée', cls: 'bg-danger-tint text-danger-fg' },
};

type BookingTab = 'pending' | 'upcoming' | 'past' | 'cancelled' | 'all';

export default function HostReservationsPage() {
  const { ready } = useHostGuard();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<BookingTab>('pending');

  const load = () =>
    api.bookings
      .asHost()
      .then(setBookings)
      .catch(() => setBookings([]));

  useEffect(() => {
    if (!ready) return;
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

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

  const nowTs = Date.now();

  const filtered = useMemo(() => {
    const byTab = (b: Booking) => {
      const endTs = new Date(b.endAt).getTime();
      switch (tab) {
        case 'pending':
          return b.status === 'PENDING';
        case 'upcoming':
          return b.status === 'CONFIRMED' && endTs >= nowTs;
        case 'past':
          return b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && endTs < nowTs);
        case 'cancelled':
          return b.status === 'CANCELLED';
        default:
          return true;
      }
    };
    return bookings
      .filter(byTab)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [bookings, tab, nowTs]);

  const tabCounts = useMemo(
    () => ({
      pending: bookings.filter((b) => b.status === 'PENDING').length,
      upcoming: bookings.filter((b) => b.status === 'CONFIRMED' && new Date(b.endAt).getTime() >= nowTs)
        .length,
      past: bookings.filter(
        (b) => b.status === 'COMPLETED' || (b.status === 'CONFIRMED' && new Date(b.endAt).getTime() < nowTs),
      ).length,
      cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
      all: bookings.length,
    }),
    [bookings, nowTs],
  );

  if (!ready || loading) return <PageLoader />;

  return (
    <div className="space-y-3">
      <PageHeader title="Réservations" />
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['pending', 'En attente'],
            ['upcoming', 'À venir'],
            ['past', 'Passées'],
            ['cancelled', 'Annulées'],
            ['all', 'Toutes'],
          ] as [BookingTab, string][]
        ).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`chip ${tab === key ? 'chip-active' : ''}`}>
            {label}
            <span className={tab === key ? 'text-white/80' : 'text-muted'}> · {tabCounts[key]}</span>
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-danger-fg">{error}</p>}

      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-muted">Aucune réservation dans cette catégorie.</div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((b) => {
            const isBusy = busyId === b.id;
            const endPassed = new Date(b.endAt).getTime() < nowTs;
            return (
              <div key={b.id} className="card space-y-3 p-3.5">
                <div className="flex items-start gap-3">
                  <CategoryIcon type={b.listing?.type ?? 'OTHER'} size={20} className="mt-0.5 flex-none text-brand-fg" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">{b.listing?.title ?? 'Annonce'}</div>
                    <div className="text-xs text-muted">
                      {b.tenant ? `${b.tenant.firstName} ${b.tenant.lastName}` : 'Locataire'} ·{' '}
                      {dateShort(b.startAt)} · {timeLabel(b.startAt)}–{timeLabel(b.endAt)} · {b.guestCount} pers.
                      {b.arrivalTime ? ` · arrivée ${b.arrivalTime}` : ''}
                    </div>
                    {b.guestNote && <div className="mt-0.5 text-xs italic text-muted">« {b.guestNote} »</div>}
                    {b.activityDescription && (
                      <div className="mt-0.5 text-xs text-muted">Activité : {b.activityDescription}</div>
                    )}
                  </div>
                  <div className="flex-none text-right">
                    <div className="text-sm font-extrabold">{fmtEUR2(netAmount(b))}</div>
                    <div className="text-[10px] text-muted">net</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${BK_STATUS[b.status]?.cls ?? 'bg-canvas text-muted'}`}>
                    {BK_STATUS[b.status]?.label ?? b.status}
                  </span>
                  <span className="flex-1" />
                  {b.status === 'PENDING' && (
                    <>
                      <button disabled={isBusy} onClick={() => run(b.id, () => api.bookings.reject(b.id))} className="btn-ghost px-3 py-2 text-[13px]">
                        Refuser
                      </button>
                      <button disabled={isBusy} onClick={() => run(b.id, () => api.bookings.approve(b.id))} className="btn-primary px-3 py-2 text-[13px]">
                        Accepter
                      </button>
                    </>
                  )}
                  {b.status === 'CONFIRMED' && (
                    <>
                      <Link href="/host/messages" className="btn-ghost px-3 py-2 text-[13px]">
                        Message
                      </Link>
                      {endPassed && (
                        <button disabled={isBusy} onClick={() => run(b.id, () => api.bookings.complete(b.id))} className="btn-primary px-3 py-2 text-[13px]">
                          Marquer terminée
                        </button>
                      )}
                    </>
                  )}
                  {b.status === 'COMPLETED' && (
                    <Link href="/host/messages" className="btn-ghost px-3 py-2 text-[13px]">
                      Message
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
