// Helpers calendrier — dates locales, semaine commençant le lundi,
// plages [start, end[ exclusives (même convention que l'API).

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

export function fromISO(iso: string): Date {
  // Accepte "YYYY-MM-DD" comme "YYYY-MM-DDT00:00:00.000Z" (format renvoyé par l'API).
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function todayISO(): string {
  return toISO(new Date());
}

export const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const MONTH_LABELS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** Grille de 42 jours (6 semaines) démarrant le lundi de la 1re semaine du mois. */
export function monthGrid(year: number, month: number): { date: Date; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // lundi = 0
  const start = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    return { date, inMonth: date.getMonth() === month };
  });
}

/** Développe des plages [start, end[ en un Set de jours ISO. */
export function expandRanges(ranges: { start: string; end: string }[]): Set<string> {
  const days = new Set<string>();
  for (const r of ranges) {
    let d = fromISO(r.start);
    const end = fromISO(r.end);
    while (d < end) {
      days.add(toISO(d));
      d = addDays(d, 1);
    }
  }
  return days;
}

/** Tous les jours ISO de [start, end[ . */
export function daysBetween(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  let d = fromISO(startISO);
  const end = fromISO(endISO);
  while (d < end) {
    out.push(toISO(d));
    d = addDays(d, 1);
  }
  return out;
}
