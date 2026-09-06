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
  PUBLISHED: 'bg-emerald-100 text-emerald-800',
  ARCHIVED: 'bg-red-100 text-red-700',
};
