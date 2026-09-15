'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { todayISO } from '@/lib/calendar';
import MonthCalendar from '@/components/month-calendar';
import { Spinner } from '@/components/ui';
import type { Slot } from '@/lib/types';

interface Props {
  listingId: string;
  value: { startDate: string; endDate: string } | null;
  onChange: (range: { startDate: string; endDate: string } | null) => void;
}

const timeLabel = (iso: string) =>
  new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// Sélecteur de créneaux horaires — pour les annonces pricingUnit = HOUR.
// Remplace DateRangePicker : on choisit un jour puis un créneau précis
// (calculé côté API à partir de ListingAvailabilityRule, des réservations
// existantes et des blocages hôte — voir GET /listings/:id/slots).
export default function TimeSlotPicker({ listingId, value, onChange }: Props) {
  const [date, setDate] = useState(todayISO());
  const [ruleDays, setRuleDays] = useState<Set<number> | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listings
      .availabilityRules(listingId)
      .then((rules) => setRuleDays(new Set(rules.map((r) => r.dayOfWeek))))
      .catch(() => setRuleDays(null));
  }, [listingId]);

  useEffect(() => {
    setLoading(true);
    api.listings
      .slots(listingId, date)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [listingId, date]);

  function pickDate(iso: string) {
    setDate(iso);
    onChange(null);
  }

  function pickSlot(slot: Slot) {
    onChange({ startDate: slot.start, endDate: slot.end });
  }

  return (
    <div className="space-y-3">
      <MonthCalendar
        months={1}
        isDisabled={ruleDays ? (iso) => !ruleDays.has(new Date(`${iso}T00:00:00`).getDay()) : undefined}
        onDayClick={pickDate}
        dayClassName={(iso) => (iso === date ? 'bg-brand text-white font-semibold' : '')}
      />

      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="text-brand" />
        </div>
      ) : slots.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted">
          Aucun créneau disponible ce jour-là.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => {
            const isSelected = value?.startDate === slot.start;
            return (
              <button
                key={slot.start}
                type="button"
                onClick={() => pickSlot(slot)}
                className={`rounded-md border px-2 py-2 text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'border-brand bg-brand text-white'
                    : 'border-line bg-surface text-ink hover:border-ink/20'
                }`}
              >
                {timeLabel(slot.start)}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted">
        {value ? `${timeLabel(value.startDate)} – ${timeLabel(value.endDate)}` : 'Choisissez un créneau.'}
      </p>
    </div>
  );
}
