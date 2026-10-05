'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import DepositCard from '@/components/deposit-card';
import { PageLoader } from '@/components/ui';
import { dateShort, timeLabel } from '@/lib/format';
import { fmtEUR2 } from '@/lib/host-stats';
import { useHostGuard } from '../use-host-guard';
import type { Booking } from '@/lib/types';

const STATUS_PILL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'En attente', cls: 'bg-warn-tint text-warn-fg' },
  CONFIRMED: { label: 'Confirmée', cls: 'bg-brand-tint text-brand-fg' },
  COMPLETED: { label: 'Terminée', cls: 'bg-canvas text-muted' },
  CANCELLED: { label: 'Annulée', cls: 'bg-danger-tint text-danger-fg' },
};

const PAYMENT_LABEL: Record<string, string> = {
  CAPTURED: 'Payé',
  AUTHORIZED: 'Autorisé',
  PENDING: 'En attente',
  REFUNDED: 'Remboursé',
  FAILED: 'Échec',
};

/** Demande en attente de validation hôte, façon PendingRequestCard du prototype. */
function PendingRequestCard({
  booking,
  busy,
  onAccept,
  onRefuse,
}: {
  booking: Booking;
  busy: boolean;
  onAccept: () => void;
  onRefuse: () => void;
}) {
  return (
    <div className="mb-2.5 rounded-md border border-line p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">
            {booking.listing?.title ?? 'Annonce'}{' '}
            <span className="font-normal text-muted">
              · {booking.tenant ? `${booking.tenant.firstName} ${booking.tenant.lastName}` : 'Locataire'}
            </span>
          </div>
          <div className="mt-0.5 text-[13px] text-muted">
            {dateShort(booking.startAt)} · {timeLabel(booking.startAt)}–{timeLabel(booking.endAt)} ·{' '}
            {fmtEUR2(booking.totalAmount)}
          </div>
        </div>
        <span className="rounded-full bg-warn-tint px-2.5 py-1 text-xs font-semibold text-warn-fg">
          En attente de validation
        </span>
      </div>

      {booking.activityDescription && (
        <div className="mt-2.5 rounded-md bg-canvas p-2.5 text-[13px]">{booking.activityDescription}</div>
      )}

      <div className="mt-3 flex gap-2.5">
        <button disabled={busy} onClick={onAccept} className="btn-primary btn-sm">
          Accepter
        </button>
        <button disabled={busy} onClick={onRefuse} className="btn-ghost btn-sm">
          Refuser
        </button>
      </div>
    </div>
  );
}

/** Réservation passée + réclamation de caution éventuelle, façon HostPastBookingCard. */
function PastBookingCard({
  booking,
  busy,
  onComplete,
}: {
  booking: Booking;
  busy: boolean;
  onComplete: () => void;
}) {
  const notYetCompleted = booking.status === 'CONFIRMED';
  return (
    <div className="mb-2.5 rounded-md border border-line p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">{booking.listing?.title ?? 'Annonce'}</div>
          <div className="mt-0.5 text-[13px] text-muted">
            {dateShort(booking.startAt)} · {timeLabel(booking.startAt)}–{timeLabel(booking.endAt)}
          </div>
        </div>
        <div className="text-right">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_PILL[booking.status]?.cls ?? 'bg-canvas text-muted'}`}>
            {STATUS_PILL[booking.status]?.label ?? booking.status}
          </span>
          <div className="mt-2 text-sm font-semibold">{fmtEUR2(booking.totalAmount)}</div>
        </div>
      </div>
      {notYetCompleted && (
        <button disabled={busy} onClick={onComplete} className="btn-ghost btn-sm mt-3">
          Marquer terminée
        </button>
      )}
      {booking.status !== 'CANCELLED' && (
        <div className="mt-3">
          <DepositCard bookingId={booking.id} role="host" />
        </div>
      )}
    </div>
  );
}

type Tab = 'upcoming' | 'ongoing' | 'past';

export default function HostReservationsPage() {
  const { ready } = useHostGuard();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('upcoming');

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
  const pending = useMemo(() => bookings.filter((b) => b.status === 'PENDING'), [bookings]);

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => {
        const startTs = new Date(b.startAt).getTime();
        const endTs = new Date(b.endAt).getTime();
        if (tab === 'upcoming') return b.status === 'CONFIRMED' && startTs > nowTs;
        if (tab === 'ongoing') return b.status === 'CONFIRMED' && startTs <= nowTs && endTs >= nowTs;
        return b.status === 'COMPLETED' || b.status === 'CANCELLED' || (b.status === 'CONFIRMED' && endTs < nowTs);
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [bookings, tab, nowTs]);

  if (!ready || loading) return <PageLoader />;

  return (
    <div>
      <h1 className="mb-5 text-xl font-bold">Réservations</h1>

      {pending.length > 0 && (
        <div className="mb-8">
          <div className="section-title mb-3">Demandes en attente ({pending.length})</div>
          {pending.map((b) => (
            <PendingRequestCard
              key={b.id}
              booking={b}
              busy={busyId === b.id}
              onAccept={() => run(b.id, () => api.bookings.approve(b.id))}
              onRefuse={() => run(b.id, () => api.bookings.reject(b.id))}
            />
          ))}
        </div>
      )}

      <div className="auth-tabs mb-4">
        {(
          [
            ['upcoming', 'à venir'],
            ['ongoing', 'en cours'],
            ['past', 'passée'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`auth-tab capitalize ${tab === key ? 'auth-tab-active' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="mb-3 text-sm text-danger-fg">{error}</p>}

      {tab === 'past' ? (
        <div>
          {filtered.length === 0 && <p className="text-[13px] text-muted">Aucune réservation passée.</p>}
          {filtered.map((b) => (
            <PastBookingCard
              key={b.id}
              booking={b}
              busy={busyId === b.id}
              onComplete={() => run(b.id, () => api.bookings.complete(b.id))}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="hidden px-4 py-2.5 text-xs font-medium text-muted sm:flex" style={{ background: '#FAFAF9' }}>
            <div className="flex-[1.4]">Espace</div>
            <div className="flex-1">Date</div>
            <div className="flex-1">Créneau</div>
            <div className="flex-1">Montant</div>
            <div className="flex-1">Paiement</div>
            <div className="flex-1">Statut</div>
          </div>
          {filtered.length === 0 && (
            <div className="px-4 py-4 text-[13px] text-muted">Aucune réservation {tab === 'upcoming' ? 'à venir' : 'en cours'}.</div>
          )}
          {filtered.map((b, i) => (
            <div
              key={b.id}
              className={`flex flex-col gap-1.5 px-4 py-3.5 text-[13px] sm:flex-row sm:items-center sm:gap-0 ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <div className="flex items-start justify-between gap-2 sm:contents">
                <div className="font-medium sm:flex-[1.4]">{b.listing?.title ?? 'Annonce'}</div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold sm:order-last sm:flex-1 ${STATUS_PILL[b.status]?.cls ?? 'bg-canvas text-muted'}`}>
                  {STATUS_PILL[b.status]?.label ?? b.status}
                </span>
                <div className="hidden text-muted sm:block sm:flex-1">{dateShort(b.startAt)}</div>
                <div className="hidden text-muted sm:block sm:flex-1">
                  {timeLabel(b.startAt)}–{timeLabel(b.endAt)}
                </div>
                <div className="hidden sm:block sm:flex-1">{fmtEUR2(b.totalAmount)}</div>
                <div className="hidden text-muted sm:block sm:flex-1">
                  {(b.payment && PAYMENT_LABEL[b.payment.status]) ?? '—'}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted sm:hidden">
                <span>{dateShort(b.startAt)}</span>
                <span>
                  {timeLabel(b.startAt)}–{timeLabel(b.endAt)}
                </span>
                <span className="font-medium text-ink">{fmtEUR2(b.totalAmount)}</span>
                {b.payment && <span>{PAYMENT_LABEL[b.payment.status]}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
