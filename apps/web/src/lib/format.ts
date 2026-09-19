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

// Le back ne fait aucune conversion de fuseau (une heure "14:00" saisie est
// stockée comme l'instant UTC 14:00:00Z) — formater ces valeurs avec le fuseau
// du navigateur décalerait l'heure affichée. timeLabel()/dateLongUTC() forcent
// l'UTC pour rester cohérents avec ce qui a été saisi.
const DATE_LONG_UTC = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function dateLongUTC(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : DATE_LONG_UTC.format(d);
}

/** "HH:mm" extrait directement de l'ISO — voir note ci-dessus. */
export function timeLabel(iso: string): string {
  return iso.slice(11, 16);
}
