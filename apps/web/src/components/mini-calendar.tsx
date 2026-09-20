'use client';
import { useState } from 'react';
import { todayISO, toISO } from '@/lib/calendar';
const BORDER = '#E7E7E7', INK = '#14171A', GRAY = '#6B7280';

export default function MiniCalendar({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value + 'T12:00:00') : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  });
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthLabel = viewDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const todayStr = todayISO();

  function selectDay(d: number) {
    const dateObj = new Date(year, month, d);
    onChange(toISO(dateObj));
  }

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, width: "100%", maxWidth: 300, boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button type="button" aria-label="Mois précédent" onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ border: `1px solid ${BORDER}`, background: "white", cursor: "pointer", fontSize: 13, color: INK, width: 26, height: 26, borderRadius: 6 }}>‹</button>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK, textTransform: "capitalize" }}>{monthLabel}</div>
        <button type="button" aria-label="Mois suivant" onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ border: `1px solid ${BORDER}`, background: "white", cursor: "pointer", fontSize: 13, color: INK, width: 26, height: 26, borderRadius: 6 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontSize: 11, color: GRAY, marginBottom: 6 }}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} style={{ textAlign: "center" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateObj = new Date(year, month, d);
          const dateStr = toISO(dateObj);
          const isSelected = dateStr === value;
          const isPast = dateStr < todayStr;
          return (
            <button type="button"
              key={i}
              aria-pressed={isSelected}
              aria-label={dateStr}
              disabled={isPast}
              onClick={() => selectDay(d)}
              style={{
                border: "none",
                background: isSelected ? INK : "transparent",
                color: isPast ? "#D8D8D5" : isSelected ? "white" : INK,
                borderRadius: 6,
                height: 30,
                fontSize: 12,
                cursor: isPast ? "not-allowed" : "pointer",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
