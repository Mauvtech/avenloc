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
