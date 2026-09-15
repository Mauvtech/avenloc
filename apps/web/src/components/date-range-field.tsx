'use client';

import { useEffect, useRef, useState } from 'react';
import MonthCalendar from '@/components/month-calendar';
import { daysBetween } from '@/lib/calendar';
import { dateShort } from '@/lib/format';

interface Props {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
  /** Intègre le champ sans son propre encadré (ex. segment d'une barre composite). */
  bare?: boolean;
  label?: string;
  placeholder?: string;
}

// Sélecteur de plage de dates sans contrainte de disponibilité (page d'accueil).
export default function DateRangeField({
  startDate,
  endDate,
  onChange,
  bare = false,
  label,
  placeholder = 'Dates (option.)',
}: Props) {
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

  const valueLabel =
    startDate && endDate
      ? `${dateShort(startDate)} → ${dateShort(endDate)}`
      : startDate
        ? `${dateShort(startDate)} → …`
        : placeholder;

  return (
    <div ref={ref} className="relative">
      <div className={bare ? 'flex items-center justify-between' : 'field flex items-center justify-between p-0'}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={bare ? 'flex-1 text-left' : 'flex-1 px-3 py-2.5 text-left'}
        >
          {label && <div className="text-[11px] font-medium text-muted">{label}</div>}
          <span className={startDate ? 'text-ink' : 'text-muted/70'}>{valueLabel}</span>
        </button>
        {startDate && (
          <button
            type="button"
            onClick={() => onChange({ startDate: '', endDate: '' })}
            className="px-3 text-muted hover:text-ink"
            aria-label="Effacer les dates"
          >
            ✕
          </button>
        )}
      </div>
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
