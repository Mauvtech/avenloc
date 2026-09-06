'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { daysBetween, expandRanges } from '@/lib/calendar';
import MonthCalendar from '@/components/month-calendar';

interface Props {
  listingId: string;
  value: { startDate: string; endDate: string } | null;
  onChange: (range: { startDate: string; endDate: string } | null) => void;
}

export default function DateRangePicker({ listingId, value, onChange }: Props) {
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listings
      .unavailable(listingId)
      .then((ranges) => setUnavailable(expandRanges(ranges)))
      .catch(() => setUnavailable(new Set()))
      .finally(() => setLoading(false));
  }, [listingId]);

  const start = value?.startDate ?? null;
  const end = value?.endDate ?? null;

  // Jours occupés par la sélection courante : [start, end[ .
  const selectedNights = useMemo(
    () => (start && end ? new Set(daysBetween(start, end)) : new Set<string>()),
    [start, end],
  );

  function pick(iso: string) {
    // Pas encore de check-in, plage complète, ou clic avant le check-in → nouveau check-in.
    if (!start || (start && end) || iso <= start) {
      onChange({ startDate: iso, endDate: '' });
      return;
    }
    // check-out : toutes les nuits [start, iso[ doivent être libres.
    if (daysBetween(start, iso).some((d) => unavailable.has(d))) {
      onChange({ startDate: iso, endDate: '' });
      return;
    }
    onChange({ startDate: start, endDate: iso });
  }

  if (loading) return <p className="py-8 text-center text-muted">Chargement du calendrier…</p>;

  return (
    <div className="space-y-2">
      <MonthCalendar
        months={1}
        isDisabled={(iso) => unavailable.has(iso)}
        onDayClick={pick}
        dayClassName={(iso) => {
          if (iso === start || (end && iso === end)) return 'bg-brand text-white font-semibold';
          if (selectedNights.has(iso) && iso !== start) return 'bg-brand-tint text-brand-fg';
          return '';
        }}
      />
      <p className="text-xs text-muted">
        {!start
          ? 'Choisissez votre date d’arrivée.'
          : !end
            ? 'Choisissez votre date de départ.'
            : `Du ${start} au ${end}`}
      </p>
    </div>
  );
}
