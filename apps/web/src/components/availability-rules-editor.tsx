'use client';

import { useState } from 'react';

export interface RuleDraft {
  dayOfWeek: number; // 0 = dimanche ... 6 = samedi
  startTime: string; // "08:00"
  endTime: string; // "19:00"
  minDurationMinutes: number;
  minLeadTimeMinutes: number;
}

interface Props {
  value: RuleDraft[];
  onChange: (rules: RuleDraft[]) => void;
}

const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' },
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 heure' },
  { value: 120, label: '2 heures' },
  { value: 240, label: 'Demi-journée' },
  { value: 480, label: 'Journée complète' },
];

const LEAD_TIME_OPTIONS = [
  { value: 0, label: 'Aucun' },
  { value: 60, label: '1 heure' },
  { value: 1440, label: '24 heures' },
];

// Horaires hebdomadaires récurrents (annonces pricingUnit = HOUR) — voir
// AvailabilityForm dans le design de référence. Composant contrôlé : les règles
// ne sont envoyées à l'API qu'à la création/mise à jour de l'annonce (voir
// ListingAvailabilityRule côté backend).
export default function AvailabilityRulesEditor({ value, onChange }: Props) {
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('19:00');
  const [minDuration, setMinDuration] = useState(60);
  const [minLeadTime, setMinLeadTime] = useState(60);

  function toggleDay(d: number) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  function addRules() {
    if (days.length === 0 || startTime >= endTime) return;
    const next = [...value];
    for (const dayOfWeek of days) {
      const idx = next.findIndex((r) => r.dayOfWeek === dayOfWeek);
      const rule: RuleDraft = {
        dayOfWeek,
        startTime,
        endTime,
        minDurationMinutes: minDuration,
        minLeadTimeMinutes: minLeadTime,
      };
      if (idx >= 0) next[idx] = rule;
      else next.push(rule);
    }
    next.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
    onChange(next);
  }

  function removeDay(dayOfWeek: number) {
    onChange(value.filter((r) => r.dayOfWeek !== dayOfWeek));
  }

  const dayLabel = (d: number) => DAYS.find((x) => x.value === d)?.label ?? String(d);

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Jours</label>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d) => {
            const active = days.includes(d.value);
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => toggleDay(d.value)}
                className={`h-9 w-11 rounded-md border text-xs font-semibold transition-colors ${
                  active ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-ink hover:border-ink/20'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="label">Heure de début</label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label className="label">Heure de fin</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="field" />
        </div>
        <div>
          <label className="label">Durée minimale</label>
          <select
            value={minDuration}
            onChange={(e) => setMinDuration(Number(e.target.value))}
            className="field"
          >
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Délai minimum</label>
          <select
            value={minLeadTime}
            onChange={(e) => setMinLeadTime(Number(e.target.value))}
            className="field"
          >
            {LEAD_TIME_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button type="button" onClick={addRules} className="btn-ghost">
        Appliquer aux jours sélectionnés
      </button>

      {value.length > 0 && (
        <div className="space-y-1.5 rounded-md border border-line p-3">
          <p className="mb-1 text-xs font-semibold text-muted">Créneaux configurés</p>
          {value.map((r) => (
            <div key={r.dayOfWeek} className="flex items-center justify-between text-sm">
              <span>
                <span className="font-semibold">{dayLabel(r.dayOfWeek)}</span> · {r.startTime}–{r.endTime} ·
                tranches de {r.minDurationMinutes} min
              </span>
              <button
                type="button"
                onClick={() => removeDay(r.dayOfWeek)}
                className="text-xs text-muted hover:text-danger-fg"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
      {value.length === 0 && (
        <p className="text-xs text-muted">
          Aucun créneau configuré — les locataires ne pourront pas réserver d&apos;heure tant qu&apos;au moins un
          jour n&apos;est pas configuré.
        </p>
      )}
    </div>
  );
}
