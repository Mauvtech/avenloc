// Libellés & métadonnées d'affichage des annonces — centralisés pour l'UI.

export const TYPE_LABEL: Record<string, string> = {
  APARTMENT: 'Appartement',
  HOUSE: 'Maison',
  ROOM: 'Chambre',
  OFFICE: 'Bureau',
  MEETING_ROOM: 'Salle de réunion',
  WORKSHOP: 'Atelier',
  WAREHOUSE: 'Entrepôt',
  EVENT_SPACE: 'Espace événementiel',
  PARKING: 'Parking',
  OTHER: 'Autre',
};

export const LISTING_TYPES = Object.keys(TYPE_LABEL);

// Ordre d'affichage sur la page d'accueil (types les plus demandés en premier).
export const BROWSE_TYPES = [
  'APARTMENT',
  'HOUSE',
  'OFFICE',
  'MEETING_ROOM',
  'EVENT_SPACE',
  'WORKSHOP',
  'WAREHOUSE',
  'PARKING',
];

// Libellé de capacité adapté au type (une salle n'a pas de « locataires »).
const CAPACITY_NOUN: Record<string, string> = {
  MEETING_ROOM: 'personnes',
  EVENT_SPACE: 'personnes',
  OFFICE: 'postes',
  WORKSHOP: 'personnes',
  WAREHOUSE: 'm² utiles',
  PARKING: 'véhicules',
};

export function capacityNoun(type: string): string {
  return CAPACITY_NOUN[type] ?? 'personnes';
}

export const UNIT_LABEL: Record<string, string> = {
  NIGHT: '/ nuit',
  HOUR: '/ heure',
  DAY: '/ jour',
};

export const UNIT_LABEL_SHORT: Record<string, string> = {
  NIGHT: 'nuit',
  HOUR: 'heure',
  DAY: 'jour',
};

export const PRICING_UNITS = Object.keys(UNIT_LABEL);

export const CANCELLATION_POLICIES = ['FLEXIBLE', 'MODERATE', 'STRICT', 'NON_REFUNDABLE'];

export const CANCELLATION_LABEL: Record<string, string> = {
  FLEXIBLE: 'Flexible',
  MODERATE: 'Modérée',
  STRICT: 'Stricte',
  NON_REFUNDABLE: 'Non remboursable',
};

export function typeLabel(type: string): string {
  return TYPE_LABEL[type] ?? type;
}

export const LISTING_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publiée',
  ARCHIVED: 'Archivée',
};

export const LISTING_STATUS_CLASS: Record<string, string> = {
  DRAFT: 'bg-canvas text-muted',
  PUBLISHED: 'bg-success-tint text-success-fg',
  ARCHIVED: 'bg-danger-tint text-danger-fg',
};
