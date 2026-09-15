// Libellés & métadonnées d'affichage des annonces — centralisés pour l'UI.

export const TYPE_LABEL: Record<string, string> = {
  OFFICE: 'Bureau privé',
  MEETING_ROOM: 'Salle de réunion',
  TRAINING_ROOM: 'Salle de formation',
  WORKSHOP: 'Atelier',
  EVENT_SPACE: 'Salle événementiel',
  BOUTIQUE: 'Boutique',
  CABINET: 'Cabinet',
  RESTAURANT: 'Restaurant',
  DESK: 'Fauteuil vacant',
  CREATIVE_STUDIO: 'Studio créatif',
  OTHER: 'Autre',
};

export const LISTING_TYPES = Object.keys(TYPE_LABEL);

// Libellé de capacité adapté au type (une salle n'a pas de « locataires »).
const CAPACITY_NOUN: Record<string, string> = {
  MEETING_ROOM: 'personnes',
  TRAINING_ROOM: 'personnes',
  EVENT_SPACE: 'personnes',
  OFFICE: 'postes',
  WORKSHOP: 'personnes',
  BOUTIQUE: 'personnes',
  CABINET: 'personnes',
  RESTAURANT: 'couverts',
  DESK: 'personne',
  CREATIVE_STUDIO: 'personnes',
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

// Détail no-show / retard / dépassement par politique — voir
// CANCELLATION_POLICIES dans le design de référence. Affiché sur la fiche
// annonce (détail repliable) et dans le formulaire hôte de configuration.
export const CANCELLATION_DETAIL: Record<
  string,
  { summary: string; noShow: string; retard: string; depassement: string }
> = {
  FLEXIBLE: {
    summary: 'Remboursement intégral jusqu’à 24h avant. Aucun remboursement après.',
    noShow: 'Facturation intégrale de la réservation.',
    retard: 'Créneau raccourci d’autant, sans remboursement de la portion manquée.',
    depassement: '15 € par tranche de 15 minutes au-delà du créneau réservé.',
  },
  MODERATE: {
    summary: 'Remboursement intégral jusqu’à 3 jours avant, 50 % jusqu’à 24h avant.',
    noShow: 'Facturation à 100 %, avis automatique à l’hôte.',
    retard: 'Tolérance de 15 min, puis créneau raccourci d’autant.',
    depassement: '20 € par tranche de 15 minutes, prélevés sur la caution si applicable.',
  },
  STRICT: {
    summary: 'Remboursement à 50 % jusqu’à 7 jours avant. Aucun remboursement après.',
    noShow: 'Facturation intégrale + signalement pour vérification de compte.',
    retard: 'Aucune tolérance, créneau raccourci dès la première minute.',
    depassement: '30 € par tranche de 15 minutes, réservation suivante prioritaire.',
  },
  NON_REFUNDABLE: {
    summary: 'Aucun remboursement, quelle que soit la date d’annulation.',
    noShow: 'Facturation intégrale de la réservation.',
    retard: 'Créneau raccourci d’autant, sans remboursement de la portion manquée.',
    depassement: '30 € par tranche de 15 minutes au-delà du créneau réservé.',
  },
};

export const ACCESS_METHOD_LABEL: Record<string, string> = {
  CODE: 'Code temporaire',
  QR: 'QR code',
  KEYBOX: 'Boîte à clés',
  SMART_LOCK: 'Serrure connectée',
  RECEPTION: 'Accueil sur place',
};
export const ACCESS_METHODS = Object.keys(ACCESS_METHOD_LABEL);

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

// Équipements : saisie libre par l'hôte (voir CreateListingDto.amenities), donc
// traduction best-effort — capitalisation simple en repli pour tout mot inconnu.
const AMENITY_LABEL: Record<string, string> = {
  wifi: 'Wifi',
  parking: 'Parking',
  kitchen: 'Cuisine équipée',
  washer: 'Lave-linge',
  heating: 'Chauffage',
  ac: 'Climatisation',
  coffee: 'Café',
  projector: 'Vidéoprojecteur',
  whiteboard: 'Tableau blanc',
  elevator: 'Ascenseur',
  terrace: 'Terrasse',
  balcony: 'Balcon',
  videoconference: 'Visioconférence',
  pmr: 'Accessible PMR',
};

export function amenityLabel(a: string): string {
  const key = a.trim().toLowerCase();
  return AMENITY_LABEL[key] ?? (key.charAt(0).toUpperCase() + key.slice(1));
}

// Équipements courants proposés au filtre de recherche (chip « Équipements »).
// Liste curatée plutôt qu'agrégée en direct depuis toutes les annonces (pas
// d'endpoint dédié) — cohérent avec le fait que Listing.amenities reste un
// champ libre côté hôte.
export const AMENITY_OPTIONS = Object.keys(AMENITY_LABEL);

// Caractéristiques spécifiques au type d'annonce (Listing.specificAttributes) —
// clés documentées dans schema.prisma § Listing.specificAttributes.
const ATTRIBUTE_LABEL: Record<string, string> = {
  floor: 'Étage',
  elevator: 'Ascenseur',
  balcony: 'Balcon',
  projector: 'Vidéoprojecteur',
  whiteboard: 'Tableau blanc',
  capacity_persons: 'Capacité',
  surface_m2: 'Surface (m²)',
  height_m: 'Hauteur sous plafond (m)',
  loading_dock: 'Quai de chargement',
  standing_desk: 'Bureau assis-debout',
  shopfront: 'Vitrine',
  storage_room: 'Réserve',
  waiting_room: "Salle d'attente",
  soundproof: 'Insonorisé',
  seats: 'Places assises',
  kitchen_equipped: 'Cuisine équipée',
  terrace: 'Terrasse',
  monitor: 'Écran',
  lighting_kit: "Kit d'éclairage",
  backdrop_colors: 'Couleurs de fond',
  spots: 'Places',
  covered: 'Couvert',
  ev_charger: 'Borne de recharge',
};

export function attributeLabel(key: string): string {
  return ATTRIBUTE_LABEL[key] ?? (key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()));
}
