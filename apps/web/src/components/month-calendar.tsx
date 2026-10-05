'use client';

import { useState } from 'react';
import {
  MONTH_LABELS,
  WEEKDAYS,
  monthGrid,
  startOfMonth,
  toISO,
  todayISO,
} from '@/lib/calendar';

interface Props {
  /** Nombre de mois affichés (empilés). */
  months?: number;
  /** Jour non sélectionnable (en plus des jours passés). */
  isDisabled?: (iso: string) => boolean;
  /** Classe(s) supplémentaires par jour (ex. jour bloqué). */
  dayClassName?: (iso: string) => string;
  onDayClick?: (iso: string) => void;
}

export default function MonthCalendar({
  months = 1,
  isDisabled,
  dayClassName,
  onDayClick,
}: Props) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const today = todayISO();

  const shift = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="rounded border border-line px-2 py-1 text-sm text-muted hover:text-ink"
          aria-label="Mois précédent"
        >
          ‹
        </button>
        <span className="text-sm font-semibold capitalize">
          {MONTH_LABELS[cursor.getMonth()]} {cursor.getFullYear()}
          {months > 1 &&
            ` – ${MONTH_LABELS[(cursor.getMonth() + months - 1) % 12]}`}
        </span>
        <button
          type="button"
          onClick={() => shift(1)}
          className="rounded border border-line px-2 py-1 text-sm text-muted hover:text-ink"
          aria-label="Mois suivant"
        >
          ›
        </button>
      </div>

      {Array.from({ length: months }, (_, m) => {
        const d = new Date(cursor.getFullYear(), cursor.getMonth() + m, 1);
        const full = monthGrid(d.getFullYear(), d.getMonth());
        // Retire la dernière semaine si elle ne contient aucun jour du mois.
        const lastInMonth = full.reduce((acc, c, i) => (c.inMonth ? i : acc), 0);
        const grid = full.slice(0, Math.ceil((lastInMonth + 1) / 7) * 7);
        return (
          <div key={m}>
            {months > 1 && (
              <div className="mb-1 text-xs font-semibold capitalize text-muted">
                {MONTH_LABELS[d.getMonth()]} {d.getFullYear()}
              </div>
            )}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((w, i) => (
                <div key={i} className="py-1 text-[11px] font-semibold text-muted">
                  {w}
                </div>
              ))}
              {grid.map(({ date, inMonth }, i) => {
                const iso = toISO(date);
                const past = iso < today;
                const disabled =
                  !inMonth || past || (isDisabled ? isDisabled(iso) : false);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => onDayClick?.(iso)}
                    className={`aspect-square rounded text-sm transition-colors ${
                      !inMonth
                        ? 'invisible'
                        : disabled
                          ? 'cursor-not-allowed text-muted/40 line-through'
                          : 'hover:bg-canvas'
                    } ${dayClassName?.(iso) ?? ''}`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
