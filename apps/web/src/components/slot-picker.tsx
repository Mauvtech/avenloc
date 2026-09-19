'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { todayISO } from '@/lib/calendar';
import { timeLabel } from '@/lib/format';
import MonthCalendar from '@/components/month-calendar';
import type { Slot } from '@/lib/types';

export interface SlotSelection {
  date: string;
  startTime: string;
  endTime: string;
}

interface Props {
  listingId: string;
  value: SlotSelection | null;
  onChange: (value: SlotSelection | null) => void;
}

/** Sélecteur jour + grille de créneaux horaires (remplace l'ancien sélecteur de
 * plage de dates — les annonces se réservent désormais par créneau). */
export default function SlotPicker({ listingId, value, onChange }: Props) {
  const [date, setDate] = useState<string>(value?.date ?? todayISO());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [anchor, setAnchor] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setAnchor(null);
    api.listings
      .slots(listingId, date)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [listingId, date]);

  function pickDay(iso: string) {
    setDate(iso);
    onChange(null);
  }

  function pickSlot(slot: Slot) {
    if (!slot.available) return;

    if (!anchor) {
      setAnchor(slot.startAt);
      onChange({ date, startTime: timeLabel(slot.startAt), endTime: timeLabel(slot.endAt) });
      return;
    }

    // Étend la sélection jusqu'au créneau cliqué si tous les créneaux
    // intermédiaires sont libres et contigus, sinon recommence depuis ce clic.
    const anchorIdx = slots.findIndex((s) => s.startAt === anchor);
    const clickedIdx = slots.findIndex((s) => s.startAt === slot.startAt);
    if (clickedIdx < 0 || anchorIdx < 0) return;

    const [from, to] = anchorIdx <= clickedIdx ? [anchorIdx, clickedIdx] : [clickedIdx, anchorIdx];
    const range = slots.slice(from, to + 1);

    if (range.some((s) => !s.available)) {
      setAnchor(slot.startAt);
      onChange({ date, startTime: timeLabel(slot.startAt), endTime: timeLabel(slot.endAt) });
      return;
    }

    setAnchor(null);
    onChange({
      date,
      startTime: timeLabel(range[0].startAt),
      endTime: timeLabel(range[range.length - 1].endAt),
    });
  }

  const selection = value && value.date === date ? value : null;

  return (
    <div className="space-y-4">
      <MonthCalendar
        months={1}
        onDayClick={pickDay}
        dayClassName={(iso) => (iso === date ? 'bg-ink text-white font-semibold' : '')}
      />

      {loading ? (
        <p className="text-sm text-muted">Chargement des créneaux…</p>
      ) : slots.length === 0 ? (
        <p className="text-sm text-muted">Aucun créneau disponible ce jour-là.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => {
            const label = timeLabel(slot.startAt);
            const inSelection =
              selection && label >= selection.startTime && timeLabel(slot.endAt) <= selection.endTime;
            return (
              <button
                key={slot.startAt}
                type="button"
                disabled={!slot.available}
                onClick={() => pickSlot(slot)}
                className={`rounded border px-2 py-2 text-sm transition-colors ${
                  !slot.available
                    ? 'cursor-not-allowed border-line text-muted/40 line-through'
                    : inSelection
                      ? 'border-ink bg-ink font-semibold text-white'
                      : 'border-line text-ink hover:border-ink/40'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted">
        {!selection
          ? 'Choisissez un créneau de départ, puis un second pour prolonger.'
          : `Le ${date} de ${selection.startTime} à ${selection.endTime}`}
      </p>
    </div>
  );
}
