'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { MONTH_LABELS, WEEKDAYS, monthGrid, startOfMonth, toISO, todayISO } from '@/lib/calendar';
import { typeLabel } from '@/lib/listing';
import type { Booking, Listing, ManagedSlot } from '@/lib/types';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'en attente', cls: 'bg-warn-tint text-warn-fg' },
  CONFIRMED: { label: 'confirmée', cls: 'bg-brand-tint text-brand-fg' },
  COMPLETED: { label: 'terminée', cls: 'bg-canvas text-muted' },
};

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Calendrier hôte unifié — toutes les réservations (toutes annonces confondues)
// + blocage/déblocage de créneaux horaires pour les annonces pricingUnit = HOUR.
// Voir HostCalendar dans le design de référence.
export default function HostCalendar({ listings }: { listings: Listing[] }) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayISO());

  const hourListings = useMemo(() => listings.filter((l) => l.pricingUnit === 'HOUR'), [listings]);
  const [managedListingId, setManagedListingId] = useState<string>('');
  const [slots, setSlots] = useState<ManagedSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.bookings
      .asHost()
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (hourListings.length > 0 && !managedListingId) {
      setManagedListingId(hourListings[0].id);
    }
  }, [hourListings, managedListingId]);

  const loadSlots = useCallback(() => {
    if (!managedListingId) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    api.listings
      .slotsForManagement(managedListingId, selectedDate)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [managedListingId, selectedDate]);

  useEffect(() => {
    setSelectedSlots([]);
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [managedListingId, selectedDate]);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const key = b.startDate.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(b);
      map.set(key, list);
    }
    return map;
  }, [bookings]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const full = monthGrid(year, month);
  const lastInMonth = full.reduce((acc, c, i) => (c.inMonth ? i : acc), 0);
  const grid = full.slice(0, Math.ceil((lastInMonth + 1) / 7) * 7);
  const today = todayISO();

  const selectedBookings = bookingsByDate.get(selectedDate) ?? [];
  const selectedLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  function toggleSlot(slot: ManagedSlot) {
    if (slot.status === 'booked') return;
    if (slot.status === 'blocked') {
      unblockOne(slot);
      return;
    }
    setSelectedSlots((cur) =>
      cur.includes(slot.start) ? cur.filter((s) => s !== slot.start) : [...cur, slot.start],
    );
  }

  async function unblockOne(slot: ManagedSlot) {
    if (!slot.availabilityId || !managedListingId) return;
    setBusy(true);
    try {
      await api.listings.unblock(managedListingId, slot.availabilityId);
      loadSlots();
    } finally {
      setBusy(false);
    }
  }

  async function blockSelected() {
    if (selectedSlots.length === 0 || !managedListingId) return;
    setBusy(true);
    try {
      for (const start of selectedSlots) {
        const slot = slots.find((s) => s.start === start);
        if (!slot) continue;
        await api.listings.blockDates(managedListingId, slot.start, slot.end);
      }
      setSelectedSlots([]);
      loadSlots();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="py-6 text-center text-sm text-muted">Chargement du calendrier…</p>;

  return (
    <div className="grid gap-7 lg:grid-cols-[1.1fr_1fr]">
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-sm hover:bg-canvas"
          >
            ‹
          </button>
          <span className="text-sm font-bold capitalize">
            {MONTH_LABELS[month]} {year}
          </span>
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-line text-sm hover:bg-canvas"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="py-1 text-[11px] font-semibold text-muted">
              {w}
            </div>
          ))}
          {grid.map(({ date, inMonth }, i) => {
            const iso = toISO(date);
            const dayBookings = bookingsByDate.get(iso) ?? [];
            const isSelected = iso === selectedDate;
            const isToday = iso === today;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDate(iso)}
                className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-md text-xs transition-colors ${
                  !inMonth
                    ? 'invisible'
                    : isSelected
                      ? 'bg-brand text-white'
                      : isToday
                        ? 'ring-1 ring-brand text-ink hover:bg-canvas'
                        : 'text-ink hover:bg-canvas'
                }`}
              >
                {date.getDate()}
                {dayBookings.length > 0 && (
                  <span className="flex gap-0.5">
                    {dayBookings.slice(0, 3).map((_, bi) => (
                      <span
                        key={bi}
                        className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-brand'}`}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-2.5 text-sm font-bold capitalize">{selectedLabel}</p>

        {selectedBookings.length > 0 && (
          <div className="mb-3.5 space-y-2">
            {selectedBookings.map((b) => {
              const st = STATUS_LABEL[b.status] ?? { label: b.status, cls: 'bg-canvas text-muted' };
              return (
                <div key={b.id} className="rounded-md border border-line p-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{b.listing?.title ?? 'Annonce'}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {timeLabel(b.startDate)} – {timeLabel(b.endDate)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hourListings.length === 0 ? (
          <p className="text-xs text-muted">
            Le blocage de créneaux horaires est disponible pour les annonces facturées à l&apos;heure.
            Pour bloquer des jours entiers, utilisez le calendrier depuis la fiche de l&apos;annonce.
          </p>
        ) : (
          <>
            {hourListings.length > 1 && (
              <select
                value={managedListingId}
                onChange={(e) => setManagedListingId(e.target.value)}
                className="field mb-2.5"
              >
                {hourListings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} ({typeLabel(l.type)})
                  </option>
                ))}
              </select>
            )}
            <p className="mb-2 text-xs text-muted">
              Sélectionnez un ou plusieurs créneaux libres pour les bloquer manuellement. Cliquez un
              créneau bloqué pour le débloquer.
            </p>
            {slotsLoading ? (
              <p className="text-sm text-muted">Chargement…</p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted">Aucun créneau configuré ce jour-là.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => {
                  const isSelected = selectedSlots.includes(slot.start);
                  return (
                    <button
                      key={slot.start}
                      type="button"
                      disabled={slot.status === 'booked' || busy}
                      onClick={() => toggleSlot(slot)}
                      className={`rounded-md border px-2 py-2 text-xs font-semibold transition-colors ${
                        isSelected
                          ? 'border-brand bg-brand text-white'
                          : slot.status === 'booked'
                            ? 'cursor-not-allowed border-line bg-canvas text-muted'
                            : slot.status === 'blocked'
                              ? 'border-danger/30 bg-danger-tint text-danger-fg'
                              : 'border-line bg-surface text-ink hover:border-ink/20'
                      }`}
                    >
                      {timeLabel(slot.start)}
                      <div className="mt-0.5 text-[10px] font-normal opacity-75">
                        {slot.status === 'booked' ? 'réservé' : slot.status === 'blocked' ? 'bloqué' : isSelected ? 'sélectionné' : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              disabled={selectedSlots.length === 0 || busy}
              onClick={blockSelected}
              className="btn-primary mt-3.5 w-full"
            >
              {selectedSlots.length === 0
                ? 'Sélectionnez des créneaux'
                : `Bloquer ${selectedSlots.length} créneau${selectedSlots.length > 1 ? 'x' : ''}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
