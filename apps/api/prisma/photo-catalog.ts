// Photothèque de démonstration — images libres Unsplash, par type de local.
const U = (id: string) =>
  `https://images.unsplash.com/${id}?w=1200&q=70&auto=format&fit=crop`;

const LIVING = [
  'photo-1522708323590-d24dbb6b0267',
  'photo-1502672260266-1c1ef2d93688',
  'photo-1493809842364-78817add7ffb',
  'photo-1560448204-e02f11c3d0e2',
  'photo-1522771739844-6a9f6d5f14af',
];

export const PHOTO_CATALOG: Record<string, string[]> = {
  APARTMENT: LIVING,
  HOUSE: [
    'photo-1568605114967-8130f3a36994',
    'photo-1570129477492-45c003edd2be',
    'photo-1564013799919-ab600027ffc6',
  ],
  ROOM: LIVING,
  OFFICE: [
    'photo-1497366216548-37526070297c',
    'photo-1524758631624-e2822e304c36',
    'photo-1497366811353-6870744d04b2',
    'photo-1531973576160-7125cd663d86',
  ],
  MEETING_ROOM: [
    'photo-1497366754035-f200968a6e72',
    'photo-1517502884422-41eaead166d4',
    'photo-1552581234-26160f608093',
  ],
  // photo-1600585152220-90363fe7e115 (une cuisine résidentielle, hors-sujet)
  // a été retiré après vérification visuelle et remplacé par un mur d'outils.
  WORKSHOP: [
    'photo-1581092160562-40aa08e78837',
    'photo-1504328345606-18bbc8c9d7d1',
    'photo-1683115098516-9b8d5c643b5b',
  ],
  WAREHOUSE: [
    'photo-1553413077-190dd305871c',
    'photo-1586528116311-ad8dd3c8310d',
    'photo-1595246140625-573b715d11dc',
  ],
  EVENT_SPACE: [
    'photo-1519167758481-83f550bb49b3',
    'photo-1464366400600-7168b8af9bc3',
    'photo-1511578314322-379afb476865',
  ],
  // Le premier ID de ce tableau (photo-1590674899484-...) a été retiré : l'image
  // n'existe plus côté Unsplash (404), ce qui cassait la couverture des annonces
  // de parking. Les deux ID restants ont été revérifiés manuellement.
  PARKING: [
    'photo-1506521781263-d8422e82f27a',
    'photo-1573348722427-f1d6819fdf98',
  ],
  OTHER: LIVING,
  // Catégories ajoutées pour les types pro du catalogue restreint (flag
  // enabledListingTypes) — avant, SHOP/PRACTICE_ROOM/RESTAURANT/CREATIVE_STUDIO
  // réutilisaient OFFICE/EVENT_SPACE/WORKSHOP par défaut, ce qui produisait des
  // photos hors-sujet (ex. un bureau générique pour une annonce de boutique).
  // Chaque ID a été revérifié visuellement avant d'être ajouté ici.
  SHOP: [
    'photo-1441984904996-e0b6ba687e04',
    'photo-1630905119003-329447458f85',
    'photo-1621261027519-a71ac66d5a68',
  ],
  PRACTICE_ROOM: [
    'photo-1682365114691-f0264ad25c52',
    'photo-1497366216548-37526070297c',
    'photo-1524758631624-e2822e304c36',
  ],
  RESTAURANT: [
    'photo-1745562294524-d01e32081b23',
    'photo-1538333581680-29dd4752ddf2',
  ],
  CREATIVE_STUDIO: [
    'photo-1767130298927-2df12c33e5d6',
    'photo-1647427854253-b92bb40c9330',
  ],
};

/** 3 URLs pour un type donné, décalées selon `offset` pour varier entre annonces. */
export function photosForType(type: string, offset = 0): string[] {
  const ids = PHOTO_CATALOG[type] ?? LIVING;
  return [0, 1, 2].map((i) => U(ids[(offset + i) % ids.length]));
}
