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

// ─── Sous-catégories par gabarit d'annonce (seed.ts / TYPE_TEMPLATES) ───────
// Chaque titre de gabarit (ex. "Bureau privé" vs "Espace de coworking") a son
// propre pool d'images, vérifiées visuellement une à une, plutôt que de
// partager le pool générique du ListingType — évite le mismatch "bureau
// générique pour une annonce de boutique" corrigé une première fois en
// restreignant les types, mais qui subsistait entre gabarits d'un même type.
const OFFICE_PRIVATE = ['photo-1715593949273-09009558300a', 'photo-1518455027359-f3f8164ba6bd'];
const OFFICE_SHARED = ['photo-1774186184383-90fc06307e77', 'photo-1772164585108-f391c1b1771a'];
const OFFICE_COWORKING = ['photo-1604328698692-f76ea9498e76', 'photo-1553028826-f4804a6dba3b'];
const OFFICE_DESIGN = ['photo-1595846723416-99a641e1231a', 'photo-1511362328651-90cc517fbe31'];

const MEETING_ROOM_STANDARD = ['photo-1571624436279-b272aff752b5', 'photo-1628062699790-7c45262b82b4'];
const MEETING_ROOM_CONFERENCE = ['photo-1697059361461-b81d0e98c3af', 'photo-1661169399398-dd271af8f651'];
const MEETING_ROOM_EQUIPPED = ['photo-1685602729277-54538940a06c', 'photo-1517502884422-41eaead166d4'];

const WORKSHOP_ARTIST = ['photo-1740710543611-80b658171bc3', 'photo-1514195037031-83d60ed3b448'];
const WORKSHOP_SHARED = ['photo-1731694411560-050e5b91e943', 'photo-1607586408909-151ba11a12e2'];
const WORKSHOP_CREATIVE = ['photo-1768695205624-101b2893644a', 'photo-1784354570909-46dd7eb9f7ed'];

const EVENT_RECEPTION = ['photo-1759477274116-e3cb02d2b9d8', 'photo-1780542900375-0cf459e38fbb'];
const EVENT_LOFT = ['photo-1776090188437-e368bbb75d93', 'photo-1779300007516-eebee9151c19'];
const EVENT_SEMINAR = ['photo-1765059818293-2eb9b7be15e9', 'photo-1762176264161-09219da49794'];

const SHOP_BOUTIQUE = ['photo-1441984904996-e0b6ba687e04', 'photo-1630905119003-329447458f85'];
const SHOP_COMMERCIAL = ['photo-1621261027519-a71ac66d5a68', 'photo-1641159930908-e9eb9ccdc002'];
const SHOP_POPUP = ['photo-1621261027519-a71ac66d5a68', 'photo-1441984904996-e0b6ba687e04'];

const PRACTICE_MEDICAL = ['photo-1682365114691-f0264ad25c52', 'photo-1581374820583-317d45555a82'];
const PRACTICE_PARAMEDICAL = ['photo-1553267570-9becda98edf8', 'photo-1787651343496-35b3666dd7d2'];
const PRACTICE_CONSULTATION = ['photo-1782080163196-26ed8ea266d7', 'photo-1581374820583-317d45555a82'];

const RESTAURANT_PRIVATE = ['photo-1769638913500-4a0b6ac4561a', 'photo-1745562294524-d01e32081b23'];
const RESTAURANT_DINING = ['photo-1745562294524-d01e32081b23', 'photo-1538333581680-29dd4752ddf2'];
const RESTAURANT_CATERING = ['photo-1589109807644-924edf14ee09', 'photo-1663790776711-9283bf614ac2'];

const CREATIVE_PHOTO = ['photo-1767130298927-2df12c33e5d6', 'photo-1647427854253-b92bb40c9330'];
const CREATIVE_GENERAL = ['photo-1786325492030-0f073cc1b550', 'photo-1767130298927-2df12c33e5d6'];
const CREATIVE_RECORDING = ['photo-1598488035139-bdbb2231ce04', 'photo-1642177437932-75d846ad48f3'];

export const PHOTO_CATALOG: Record<string, string[]> = {
  APARTMENT: LIVING,
  HOUSE: [
    'photo-1568605114967-8130f3a36994',
    'photo-1570129477492-45c003edd2be',
    'photo-1564013799919-ab600027ffc6',
  ],
  ROOM: LIVING,
  // Pools génériques par ListingType — utilisés en secours par photosForType()
  // quand aucun gabarit précis n'est connu (ex. backfill-photos.ts, qui ne
  // connaît que le type stocké en base, pas le titre d'origine de l'annonce).
  // Constitués de l'union des sous-catégories ci-dessus pour rester
  // représentatifs de toute la variété d'un type.
  OFFICE: [...OFFICE_PRIVATE, ...OFFICE_SHARED, ...OFFICE_COWORKING, ...OFFICE_DESIGN],
  MEETING_ROOM: [...MEETING_ROOM_STANDARD, ...MEETING_ROOM_CONFERENCE, ...MEETING_ROOM_EQUIPPED],
  WORKSHOP: [...WORKSHOP_ARTIST, ...WORKSHOP_SHARED, ...WORKSHOP_CREATIVE],
  WAREHOUSE: [
    'photo-1553413077-190dd305871c',
    'photo-1586528116311-ad8dd3c8310d',
    'photo-1595246140625-573b715d11dc',
  ],
  EVENT_SPACE: [...EVENT_RECEPTION, ...EVENT_LOFT, ...EVENT_SEMINAR],
  // Le premier ID de ce tableau (photo-1590674899484-...) a été retiré : l'image
  // n'existe plus côté Unsplash (404), ce qui cassait la couverture des annonces
  // de parking. Les deux ID restants ont été revérifiés manuellement.
  PARKING: [
    'photo-1506521781263-d8422e82f27a',
    'photo-1573348722427-f1d6819fdf98',
  ],
  OTHER: LIVING,
  SHOP: [...SHOP_BOUTIQUE, ...SHOP_COMMERCIAL],
  PRACTICE_ROOM: [...PRACTICE_MEDICAL, ...PRACTICE_PARAMEDICAL],
  RESTAURANT: [...RESTAURANT_DINING, ...RESTAURANT_CATERING],
  CREATIVE_STUDIO: [...CREATIVE_PHOTO, ...CREATIVE_RECORDING],

  // Sous-catégories par gabarit (seed.ts TYPE_TEMPLATES[].variants[].photoCategory).
  OFFICE_PRIVATE,
  OFFICE_SHARED,
  OFFICE_COWORKING,
  OFFICE_DESIGN,
  MEETING_ROOM_STANDARD,
  MEETING_ROOM_CONFERENCE,
  MEETING_ROOM_EQUIPPED,
  WORKSHOP_ARTIST,
  WORKSHOP_SHARED,
  WORKSHOP_CREATIVE,
  EVENT_RECEPTION,
  EVENT_LOFT,
  EVENT_SEMINAR,
  SHOP_BOUTIQUE,
  SHOP_COMMERCIAL,
  SHOP_POPUP,
  PRACTICE_MEDICAL,
  PRACTICE_PARAMEDICAL,
  PRACTICE_CONSULTATION,
  RESTAURANT_PRIVATE,
  RESTAURANT_DINING,
  RESTAURANT_CATERING,
  CREATIVE_PHOTO,
  CREATIVE_GENERAL,
  CREATIVE_RECORDING,
};

/** 3 URLs pour une catégorie donnée, décalées selon `offset` pour varier entre annonces. */
export function photosForType(type: string, offset = 0): string[] {
  const ids = PHOTO_CATALOG[type] ?? LIVING;
  return [0, 1, 2].map((i) => U(ids[(offset + i) % ids.length]));
}
