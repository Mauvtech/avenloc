// Libellés & métadonnées d'affichage des annonces — centralisés pour l'UI.

export const TYPE_LABEL: Record<string, string> = {
  APARTMENT: 'Appartement',
  HOUSE: 'Maison',
  ROOM: 'Chambre',
  OFFICE: 'Bureau privé',
  MEETING_ROOM: 'Salle de réunion',
  TRAINING_ROOM: 'Salle de formation',
  VACANT_CHAIR: 'Fauteuil vacant',
  WORKSHOP: 'Atelier',
  WAREHOUSE: 'Entrepôt',
  EVENT_SPACE: 'Espace événementiel',
  PARKING: 'Parking',
  SHOP: 'Boutique',
  PRACTICE_ROOM: 'Cabinet',
  RESTAURANT: 'Restaurant',
  CREATIVE_STUDIO: 'Studio créatif',
  OTHER: 'Autre',
};

export const LISTING_TYPES = Object.keys(TYPE_LABEL);

export const PROTOTYPE_TYPE_OPTIONS = [
  'MEETING_ROOM', 'OFFICE', 'TRAINING_ROOM', 'VACANT_CHAIR', 'SHOP',
  'PRACTICE_ROOM', 'RESTAURANT', 'CREATIVE_STUDIO', 'WORKSHOP', 'EVENT_SPACE',
].map((value) => ({ value, label: value === 'EVENT_SPACE' ? 'Salle événementiel' : TYPE_LABEL[value] }));

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
  'SHOP',
  'PRACTICE_ROOM',
  'RESTAURANT',
  'CREATIVE_STUDIO',
];

// Libellé de capacité adapté au type (une salle n'a pas de « locataires »).
const CAPACITY_NOUN: Record<string, string> = {
  MEETING_ROOM: 'personnes',
  EVENT_SPACE: 'personnes',
  OFFICE: 'postes',
  WORKSHOP: 'personnes',
  WAREHOUSE: 'm² utiles',
  PARKING: 'véhicules',
  SHOP: 'personnes',
  PRACTICE_ROOM: 'personnes',
  RESTAURANT: 'couverts',
  CREATIVE_STUDIO: 'personnes',
};

export const ACCESS_METHOD_LABEL: Record<string, string> = {
  CONNECTED_LOCK: 'Serrure connectée',
  ACCESS_CODE: "Code d'accès",
  KEY_BOX: 'Boîte à clés',
  QR_CODE: 'QR code',
  RECEPTION: 'Accueil sur place',
};

export const ACCESS_METHODS = Object.keys(ACCESS_METHOD_LABEL);

export const WEEKDAY_LABEL: Record<number, string> = {
  0: 'Dim',
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
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
  PENDING_VALIDATION: 'À valider',
};

export const LISTING_STATUS_CLASS: Record<string, string> = {
  DRAFT: 'bg-canvas text-muted',
  PUBLISHED: 'bg-success-tint text-success-fg',
  ARCHIVED: 'bg-danger-tint text-danger-fg',
  PENDING_VALIDATION: 'bg-warn-tint text-warn-fg',
};
