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
  WORKSHOP: [
    'photo-1581092160562-40aa08e78837',
    'photo-1504328345606-18bbc8c9d7d1',
    'photo-1600585152220-90363fe7e115',
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
  PARKING: [
    'photo-1590674899484-d5640e854aba',
    'photo-1506521781263-d8422e82f27a',
    'photo-1573348722427-f1d6819fdf98',
  ],
  OTHER: LIVING,
};

/** 3 URLs pour un type donné, décalées selon `offset` pour varier entre annonces. */
export function photosForType(type: string, offset = 0): string[] {
  const ids = PHOTO_CATALOG[type] ?? LIVING;
  return [0, 1, 2].map((i) => U(ids[(offset + i) % ids.length]));
}
