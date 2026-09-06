'use client';

import { useEffect, useRef, useState } from 'react';
import MonthCalendar from '@/components/month-calendar';
import { daysBetween } from '@/lib/calendar';
import { dateShort } from '@/lib/format';

interface Props {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
}

// Sélecteur de plage de dates sans contrainte de disponibilité (page d'accueil).
export default function DateRangeField({ startDate, endDate, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected =
    startDate && endDate ? new Set(daysBetween(startDate, endDate)) : new Set<string>();

  function pick(iso: string) {
    if (!startDate || (startDate && endDate) || iso <= startDate) {
      onChange({ startDate: iso, endDate: '' });
    } else {
      onChange({ startDate, endDate: iso });
      setOpen(false);
    }
  }

  const label =
    startDate && endDate
      ? `${dateShort(startDate)} → ${dateShort(endDate)}`
      : startDate
        ? `${dateShort(startDate)} → …`
        : 'Dates (option.)';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="field flex items-center justify-between text-left"
      >
        <span className={startDate ? 'text-ink' : 'text-muted/70'}>{label}</span>
        {startDate && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onChange({ startDate: '', endDate: '' });
            }}
            className="ml-2 text-muted hover:text-ink"
            aria-label="Effacer les dates"
          >
            ✕
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-[min(20rem,90vw)] rounded-lg border border-line bg-surface p-3 shadow-modal">
          <MonthCalendar
            months={2}
            onDayClick={pick}
            dayClassName={(iso) => {
              if (iso === startDate || iso === endDate) return 'bg-brand text-white font-semibold';
              if (selected.has(iso)) return 'bg-brand-tint text-brand-fg';
              return '';
            }}
          />
        </div>
      )}
    </div>
  );
}
