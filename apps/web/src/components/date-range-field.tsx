'use client';

import { useEffect, useRef, useState } from 'react';
import MiniCalendar from '@/components/mini-calendar';
import { dateShort } from '@/lib/format';

interface Props {
  startDate: string;
  endDate: string;
  onChange: (range: { startDate: string; endDate: string }) => void;
}

export default function DateRangeField({ startDate, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    function outside(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    }
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center justify-between">
        <button ref={trigger} type="button" aria-label="Choisir les dates" aria-expanded={open} aria-haspopup="dialog"
          onClick={() => setOpen(!open)} className={`min-h-6 flex-1 py-0.5 text-left text-sm ${open ? 'font-semibold text-brand' : 'text-ink'}`}>
          {startDate ? dateShort(startDate) : '\u00a0'}
        </button>
        {startDate && <button type="button" onClick={() => onChange({ startDate: '', endDate: '' })} aria-label="Effacer les dates" className="text-xs text-muted">✕</button>}
      </div>
      {open && <div role="dialog" aria-label="Quand ?" className="absolute left-0 top-full z-50 mt-2 w-[300px] max-w-[calc(100vw-4rem)] rounded-[10px] bg-white shadow-modal">
        <MiniCalendar value={startDate} onChange={(date) => {
          onChange({ startDate: date, endDate: date }); setOpen(false); trigger.current?.focus();
        }} />
      </div>}
    </div>
  );
}
