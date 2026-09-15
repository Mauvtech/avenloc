// Formatage partagé — une seule source de vérité pour les montants et dates.

const EUR = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

const EUR_ROUND = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

/** 1234.5 → « 1 234,50 € ». Accepte string ou number. */
export function eur(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? EUR.format(n) : '—';
}

/** Montant sans centimes — pour les prix « à partir de » et les KPI. */
export function eurRound(value: string | number): string {
  const n = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(n) ? EUR_ROUND.format(n) : '—';
}

const DATE_SHORT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });
const DATE_LONG = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function dateShort(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : DATE_SHORT.format(d);
}

export function dateLong(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : DATE_LONG.format(d);
}

const TIME_SHORT = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

/** 2026-09-25T08:00:00Z → « 08:00 ». */
export function timeShort(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : TIME_SHORT.format(d);
}

/** « il y a 12 min » / « hier » / « 3 sept. » — pour les fils d'activité. */
export function timeAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} j`;
  return dateShort(iso);
}
