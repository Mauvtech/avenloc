import { PrismaClient, Prisma, ListingType, PricingUnit, CancellationPolicy } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { photosForType } from './photo-catalog';

const client = new PrismaClient();
let prisma: Prisma.TransactionClient;

async function ensurePhotos(listingId: string, type: string, offset: number) {
  const count = await prisma.listingPhoto.count({ where: { listingId } });
  if (count > 0) return;
  await prisma.listingPhoto.createMany({
    data: photosForType(type, offset).map((url, position) => ({
      listingId,
      url,
      position,
    })),
  });
}

// ─── Petits helpers de calcul / dates (pas de dépendance à PricingService,
// qui vit dans le contexte NestJS — on reproduit sa formule ici) ────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pricing(basePrice: number, unitCount: number, cleaningFee = 0) {
  const baseAmount = round2(basePrice * unitCount);
  const serviceFee = round2((baseAmount + cleaningFee) * 0.12);
  const taxAmount = round2((baseAmount + cleaningFee + serviceFee) * 0.2);
  const totalAmount = round2(baseAmount + cleaningFee + serviceFee + taxAmount);
  return { baseAmount, cleaningFee, serviceFee, taxAmount, totalAmount };
}

/** Instant à `offsetDays` de maintenant (négatif = passé), à l'heure UTC donnée. */
function atDay(offsetDays: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setUTCHours(hour, minute, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 3_600_000);
}

const verifiedAt = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000);

// ─── Génération procédurale d'un grand catalogue de remplissage ────────────
// (en plus des annonces "vedettes" ci-dessus, qui ont avis/FAQ/réservations).
// RNG déterministe (seed fixe) : le catalogue généré est stable d'un
// `db:seed` à l'autre, plutôt que de changer à chaque exécution.

function mulberry32(seed: number) {
  let t = seed;
  return function random(): number {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260919);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const randInt = (min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));
const round4 = (n: number): number => Math.round(n * 10_000) / 10_000;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const CITIES = [
  { name: 'Paris', lat: 48.8566, lng: 2.3522, postal: '75011' },
  { name: 'Lyon', lat: 45.764, lng: 4.8357, postal: '69003' },
  { name: 'Marseille', lat: 43.2965, lng: 5.3698, postal: '13006' },
  { name: 'Bordeaux', lat: 44.8378, lng: -0.5792, postal: '33000' },
  { name: 'Lille', lat: 50.6292, lng: 3.0573, postal: '59000' },
  { name: 'Toulouse', lat: 43.6047, lng: 1.4442, postal: '31000' },
  { name: 'Nantes', lat: 47.2184, lng: -1.5536, postal: '44000' },
  { name: 'Strasbourg', lat: 48.5734, lng: 7.7521, postal: '67000' },
  { name: 'Nice', lat: 43.7102, lng: 7.262, postal: '06000' },
  { name: 'Montpellier', lat: 43.6108, lng: 3.8767, postal: '34000' },
];

const STREET_NAMES = [
  'Rue de la République', 'Avenue Victor Hugo', 'Rue du Commerce', 'Boulevard Gambetta',
  'Rue Jean Jaurès', 'Place de la Mairie', 'Rue des Fleurs', 'Avenue de la Gare',
  'Rue Nationale', 'Quai des Chartrons', 'Rue Pasteur', 'Avenue Foch',
  'Rue de la Liberté', 'Boulevard Voltaire', 'Rue du Général de Gaulle',
];

const AMENITY_POOL = [
  'wifi', 'parking', 'kitchen', 'coffee', 'heating', 'ac', 'desk', 'projector',
  'whiteboard', 'tools', 'security-camera', 'elevator', 'wheelchair-access', 'ventilation',
];

const FIRST_NAMES = [
  'Julien', 'Claire', 'Antoine', 'Manon', 'Thomas', 'Léa', 'Hugo', 'Emma',
  'Maxime', 'Chloé', 'Nicolas', 'Julie', 'Alexandre', 'Sarah', 'Romain', 'Inès',
];
const LAST_NAMES = [
  'Girard', 'Fontaine', 'Moreau', 'Lefèvre', 'Simon', 'Michel', 'Garcia', 'David',
  'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel', 'André', 'Mercier', 'Blanchard',
];

// La quasi-totalité des SpaceCard du prototype affichent une note — sans ça,
// le catalogue de remplissage a l'air vide de tout historique. On génère donc
// 1 à 5 avis (skewed positif) sur ~82% des annonces de remplissage publiées.
const REVIEW_COMMENTS = [
  'Espace conforme à la description, accès facile.',
  'Très bon rapport qualité-prix, je recommande.',
  "Hôte réactif, tout s'est bien passé.",
  'Propre et bien situé, parfait pour mes besoins.',
  'Quelques détails à revoir mais globalement satisfait.',
  "Exactement ce qu'il me fallait pour mon événement.",
  'Accueil chaleureux, équipement au top.',
  "Un peu bruyant mais l'espace reste agréable.",
  'Rien à redire, je reviendrai.',
  'Bon emplacement, facile d’accès en transport.',
];
const RATING_WEIGHTS = [3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 2];

interface TypeTemplateVariant {
  title: string;
  // Sous-catégorie de photo-catalog.ts (PHOTO_CATALOG) — plus précise que le
  // ListingType seul, pour éviter qu'un "Bureau privé" et un "Espace de
  // coworking" partagent le même pool d'images générique.
  photoCategory: string;
}

interface TypeTemplate {
  type: ListingType;
  variants: TypeTemplateVariant[];
  pricingUnit: PricingUnit;
  priceRange: [number, number];
  maxGuestsRange?: [number, number];
}

const TYPE_TEMPLATES: TypeTemplate[] = [
  {
    type: ListingType.OFFICE, pricingUnit: PricingUnit.HOUR, priceRange: [10, 30], maxGuestsRange: [1, 8],
    variants: [
      { title: 'Bureau privé', photoCategory: 'OFFICE_PRIVATE' },
      { title: 'Bureau partagé', photoCategory: 'OFFICE_SHARED' },
      { title: 'Espace de coworking', photoCategory: 'OFFICE_COWORKING' },
      { title: 'Bureau design', photoCategory: 'OFFICE_DESIGN' },
    ],
  },
  {
    type: ListingType.MEETING_ROOM, pricingUnit: PricingUnit.HOUR, priceRange: [25, 70], maxGuestsRange: [4, 20],
    variants: [
      { title: 'Salle de réunion', photoCategory: 'MEETING_ROOM_STANDARD' },
      { title: 'Salle de conférence', photoCategory: 'MEETING_ROOM_CONFERENCE' },
      { title: 'Salle équipée', photoCategory: 'MEETING_ROOM_EQUIPPED' },
    ],
  },
  {
    type: ListingType.WORKSHOP, pricingUnit: PricingUnit.HOUR, priceRange: [20, 45], maxGuestsRange: [2, 12],
    variants: [
      { title: "Atelier d'artiste", photoCategory: 'WORKSHOP_ARTIST' },
      { title: 'Atelier partagé', photoCategory: 'WORKSHOP_SHARED' },
      { title: 'Espace créatif manuel', photoCategory: 'WORKSHOP_CREATIVE' },
    ],
  },
  {
    type: ListingType.EVENT_SPACE, pricingUnit: PricingUnit.HOUR, priceRange: [40, 120], maxGuestsRange: [10, 150],
    variants: [
      { title: 'Salle de réception', photoCategory: 'EVENT_RECEPTION' },
      { title: 'Loft événementiel', photoCategory: 'EVENT_LOFT' },
      { title: 'Espace pour séminaire', photoCategory: 'EVENT_SEMINAR' },
    ],
  },
  {
    type: ListingType.SHOP, pricingUnit: PricingUnit.HOUR, priceRange: [15, 45], maxGuestsRange: [2, 20],
    variants: [
      { title: 'Boutique en rez-de-chaussée', photoCategory: 'SHOP_BOUTIQUE' },
      { title: 'Local commercial', photoCategory: 'SHOP_COMMERCIAL' },
      { title: 'Corner shop éphémère', photoCategory: 'SHOP_POPUP' },
    ],
  },
  {
    type: ListingType.PRACTICE_ROOM, pricingUnit: PricingUnit.HOUR, priceRange: [18, 35], maxGuestsRange: [1, 3],
    variants: [
      { title: 'Cabinet médical', photoCategory: 'PRACTICE_MEDICAL' },
      { title: 'Cabinet paramédical', photoCategory: 'PRACTICE_PARAMEDICAL' },
      { title: 'Salle de consultation', photoCategory: 'PRACTICE_CONSULTATION' },
    ],
  },
  {
    type: ListingType.RESTAURANT, pricingUnit: PricingUnit.HOUR, priceRange: [50, 150], maxGuestsRange: [10, 80],
    variants: [
      { title: 'Restaurant privatisable', photoCategory: 'RESTAURANT_PRIVATE' },
      { title: 'Salle de restaurant', photoCategory: 'RESTAURANT_DINING' },
      { title: 'Espace traiteur', photoCategory: 'RESTAURANT_CATERING' },
    ],
  },
  {
    type: ListingType.CREATIVE_STUDIO, pricingUnit: PricingUnit.HOUR, priceRange: [25, 60], maxGuestsRange: [1, 10],
    variants: [
      { title: 'Studio photo', photoCategory: 'CREATIVE_PHOTO' },
      { title: 'Studio créatif', photoCategory: 'CREATIVE_GENERAL' },
      { title: "Studio d'enregistrement", photoCategory: 'CREATIVE_RECORDING' },
    ],
  },
];

/** Génère un grand catalogue de remplissage (hôtes "filler-host-*", pas de
 * réservations à venir ; des avis liés à des réservations terminées). */
async function generateFillerListings(count: number, hashedPassword: string): Promise<number> {
  const FILLER_HOST_COUNT = 16;
  const fillerHosts: { id: string }[] = [];

  for (let i = 0; i < FILLER_HOST_COUNT; i++) {
    const email = `filler-host-${String(i + 1).padStart(2, '0')}@aven.dev`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        hashedPassword,
        firstName: FIRST_NAMES[i % FIRST_NAMES.length],
        lastName: LAST_NAMES[(i * 3 + 1) % LAST_NAMES.length],
        roles: ['HOST', 'TENANT'],
      },
    });
    fillerHosts.push(u);
  }

  const FILLER_REVIEWER_COUNT = 8;
  const fillerReviewers: { id: string }[] = [];
  for (let i = 0; i < FILLER_REVIEWER_COUNT; i++) {
    const email = `filler-reviewer-${String(i + 1).padStart(2, '0')}@aven.dev`;
    const u = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        hashedPassword,
        firstName: FIRST_NAMES[(i + 7) % FIRST_NAMES.length],
        lastName: LAST_NAMES[(i * 5 + 2) % LAST_NAMES.length],
        roles: ['TENANT'],
      },
    });
    fillerReviewers.push(u);
  }

  let created = 0;
  for (let i = 0; i < count; i++) {
    const tpl = pick(TYPE_TEMPLATES);
    const city = pick(CITIES);
    const street = pick(STREET_NAMES);
    const houseNumber = randInt(1, 140);
    const variant = pick(tpl.variants);
    const titleBase = variant.title;
    const listingHost = fillerHosts[i % fillerHosts.length];
    const price = randInt(tpl.priceRange[0], tpl.priceRange[1]);
    const isVerified = rng() < 0.45;
    const status = rng() < 0.9 ? 'PUBLISHED' : 'DRAFT';

    const listing = await prisma.listing.create({
      data: {
        hostId: listingHost.id,
        type: tpl.type,
        status,
        verifiedAt: isVerified ? verifiedAt(randInt(1, 90)) : null,
        title: `${titleBase} à ${city.name}`,
        description: `${titleBase} disponible à l'heure pour vos activités professionnelles. Un espace adapté à un usage ponctuel ou récurrent, avec les équipements présentés dans l'annonce.`,
        addressLine1: `${houseNumber} ${street}`,
        city: city.name,
        postalCode: city.postal,
        country: 'FR',
        latitude: round4(city.lat + (rng() - 0.5) * 0.06),
        longitude: round4(city.lng + (rng() - 0.5) * 0.06),
        maxGuests: tpl.maxGuestsRange ? randInt(tpl.maxGuestsRange[0], tpl.maxGuestsRange[1]) : null,
        pricingUnit: tpl.pricingUnit,
        basePrice: price,
        cancellationPolicy: pick([CancellationPolicy.FLEXIBLE, CancellationPolicy.MODERATE, CancellationPolicy.STRICT]),
        instantBookEnabled: rng() < 0.5,
        amenities: shuffle(AMENITY_POOL).slice(0, randInt(2, 5)),
      },
    });
    await ensurePhotos(listing.id, variant.photoCategory, i);

    if (status === 'PUBLISHED' && rng() < 0.82) {
      const reviewCount = randInt(1, 5);
      for (let r = 0; r < reviewCount; r++) {
        const reviewer = fillerReviewers[(i * 7 + r * 3) % fillerReviewers.length];
        const startAt = atDay(-(20 + r * 9 + (i % 15)), 9 + r * 2);
        const durationHours = tpl.pricingUnit === PricingUnit.HOUR ? randInt(1, 3) : 24;
        const endAt = addHours(startAt, durationHours);
        const unitCount = tpl.pricingUnit === PricingUnit.HOUR ? durationHours : 1;
        const amounts = pricing(price, unitCount);
        const booking = await prisma.booking.create({
          data: {
            listingId: listing.id,
            tenantId: reviewer.id,
            status: 'COMPLETED',
            startAt,
            endAt,
            unitCount,
            guestCount: 1,
            houseRulesAccepted: true,
            ...amounts,
          },
        });
        await prisma.payment.create({
          data: {
            bookingId: booking.id,
            status: 'CAPTURED',
            amount: amounts.totalAmount,
            platformFee: amounts.serviceFee,
            hostPayout: round2(amounts.totalAmount - amounts.serviceFee),
            capturedAt: endAt,
          },
        });
        await prisma.review.create({
          data: {
            bookingId: booking.id,
            authorId: reviewer.id,
            target: 'LISTING',
            rating: pick(RATING_WEIGHTS),
            comment: pick(REVIEW_COMMENTS),
            listingId: listing.id,
          },
        });
      }
    }

    created++;
  }

  return created;
}

async function seed() {
  console.log('🌱 Seeding database...');

  await prisma.platformConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      serviceFeeRate: 0.12,
      taxRate: 0.2,
      currency: 'EUR',
      hostApprovalWindowHours: 24,
    },
  });
  console.log('✓ PlatformConfig seeded');

  // ── Utilisateurs ──────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Password123!', 12);

  const host = await prisma.user.upsert({
    where: { email: 'host@aven.dev' },
    update: {},
    create: { email: 'host@aven.dev', hashedPassword, firstName: 'Marie', lastName: 'Dupont', roles: ['HOST', 'TENANT'] },
  });
  const host2 = await prisma.user.upsert({
    where: { email: 'host2@aven.dev' },
    update: {},
    create: { email: 'host2@aven.dev', hashedPassword, firstName: 'Lucas', lastName: 'Bernard', roles: ['HOST', 'TENANT'] },
  });
  const host3 = await prisma.user.upsert({
    where: { email: 'host3@aven.dev' },
    update: {},
    create: { email: 'host3@aven.dev', hashedPassword, firstName: 'Camille', lastName: 'Rousseau', roles: ['HOST', 'TENANT'] },
  });
  const tenant = await prisma.user.upsert({
    where: { email: 'tenant@aven.dev' },
    update: {},
    create: { email: 'tenant@aven.dev', hashedPassword, firstName: 'Jean', lastName: 'Martin', roles: ['TENANT'] },
  });
  const reviewer1 = await prisma.user.upsert({
    where: { email: 'reviewer1@aven.dev' },
    update: {},
    create: { email: 'reviewer1@aven.dev', hashedPassword, firstName: 'Sophie', lastName: 'Lambert', roles: ['TENANT'] },
  });
  const reviewer2 = await prisma.user.upsert({
    where: { email: 'reviewer2@aven.dev' },
    update: {},
    create: { email: 'reviewer2@aven.dev', hashedPassword, firstName: 'Nicolas', lastName: 'Petit', roles: ['TENANT'] },
  });
  const commercial = await prisma.user.upsert({
    where: { email: 'commercial@aven.dev' },
    update: {},
    create: { email: 'commercial@aven.dev', hashedPassword, firstName: 'Sofia', lastName: 'Nguyen', roles: ['COMMERCIAL', 'TENANT'] },
  });
  const admin = await prisma.user.upsert({
    where: { email: 'admin@aven.dev' },
    update: { roles: ['ADMIN'] },
    create: { email: 'admin@aven.dev', hashedPassword, firstName: 'Admin', lastName: 'Aven', roles: ['ADMIN'] },
  });
  const moderator = await prisma.user.upsert({
    where: { email: 'moderator@aven.dev' },
    update: { roles: ['MODERATOR'] },
    create: { email: 'moderator@aven.dev', hashedPassword, firstName: 'Modération', lastName: 'Aven', roles: ['MODERATOR'] },
  });
  console.log('✓ Utilisateurs seedés (voir le récapitulatif en fin de script)');

  // Remplacement atomique du catalogue de démo. DELETE laisse les lecteurs
  // consulter l'ancien catalogue jusqu'au commit, contrairement à TRUNCATE.
  // main() refuse cette opération si la base contient des comptes non-démo.
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.review.deleteMany();
  await prisma.deposit.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.hostInvitation.deleteMany();
  await prisma.establishment.deleteMany();
  console.log('✓ Anciennes annonces de test nettoyées');

  // ── Paris — Marie (host) ──────────────────────────────────────────────────
  const creativeStudio = await prisma.listing.create({
    data: {
      id: '72d60f9a-8528-49e5-a911-7a2a546c3906',
      hostId: host.id,
      type: 'CREATIVE_STUDIO',
      status: 'PUBLISHED',
      title: 'Studio photo lumineux dans le Marais',
      description:
        'Studio photo de 45m² au cœur du Marais. Lumière naturelle, hauteur sous plafond de 3m, fonds et éclairage fournis pour vos séances photo.',
      addressLine1: '12 Rue des Rosiers',
      city: 'Paris',
      postalCode: '75004',
      country: 'FR',
      latitude: 48.8566,
      longitude: 2.3522,
      maxGuests: 6,
      pricingUnit: 'HOUR',
      basePrice: 40,
      cleaningFee: 25,
      cancellationPolicy: 'MODERATE',
      instantBookEnabled: false,
      amenities: ['wifi', 'heating', 'elevator'],
      specificAttributes: { surface_m2: 45, natural_light: true },
    },
  });

  const meetingRoom = await prisma.listing.create({
    data: {
      id: 'fabcc917-94cb-46fa-9d62-00d80f9a6035',
      hostId: host.id,
      type: 'MEETING_ROOM',
      status: 'PUBLISHED',
      verifiedAt: verifiedAt(14),
      title: 'Salle de réunion moderne 12 personnes',
      description:
        'Salle lumineuse avec projecteur 4K, tableau blanc et climatisation. Idéale pour vos réunions et présentations.',
      addressLine1: '45 Avenue des Champs-Élysées',
      city: 'Paris',
      postalCode: '75008',
      country: 'FR',
      latitude: 48.8698,
      longitude: 2.3078,
      pricingUnit: 'HOUR',
      basePrice: 45,
      cancellationPolicy: 'FLEXIBLE',
      instantBookEnabled: false,
      amenities: ['wifi', 'projector', 'whiteboard', 'ac', 'coffee'],
      specificAttributes: { projector: true, whiteboard: true, capacity_persons: 12 },
      depositAmount: 200,
      openDays: [1, 2, 3, 4, 5],
      openStartTime: '08:00',
      openEndTime: '19:00',
      minDurationMinutes: 60,
      minNoticeHours: 2,
      accessMethod: 'ACCESS_CODE',
      accessInstructions: 'Code porte : 4821A — valable pour la durée du créneau réservé.',
      rcProRequired: true,
      houseRules:
        'Non-fumeur. Interdiction de déplacer le mobilier fixe. Nettoyage sommaire demandé après usage. Toute dégradation sera facturée sur la caution.',
    },
  });

  await prisma.listingFaqItem.createMany({
    data: [
      {
        listingId: meetingRoom.id,
        question: 'Y a-t-il un vidéoprojecteur ?',
        answer: "Oui, la salle est équipée d'un écran 4K avec câble HDMI et adaptateur USB-C fournis.",
        position: 0,
      },
      {
        listingId: meetingRoom.id,
        question: 'Le café est-il inclus dans le prix ?',
        answer: 'Oui, une machine à café en libre-service est à disposition dans la salle.',
        position: 1,
      },
    ],
  });

  const office = await prisma.listing.create({
    data: {
      hostId: host.id,
      type: 'OFFICE',
      status: 'PUBLISHED',
      verifiedAt: verifiedAt(30),
      title: 'Bureau lumineux Bastille',
      description:
        'Bureau privé de 20m² dans un immeuble calme proche Bastille. Idéal pour du travail concentré ou recevoir un client.',
      addressLine1: '10 Rue de la Roquette',
      city: 'Paris',
      postalCode: '75011',
      country: 'FR',
      latitude: 48.8532,
      longitude: 2.3692,
      maxGuests: 4,
      pricingUnit: 'HOUR',
      basePrice: 18,
      cancellationPolicy: 'MODERATE',
      instantBookEnabled: true,
      amenities: ['wifi', 'desk', 'coffee'],
      specificAttributes: { surface_m2: 20, standing_desk: true },
    },
  });

  const eventSpace = await prisma.listing.create({
    data: {
      hostId: host.id,
      type: 'EVENT_SPACE',
      status: 'PUBLISHED',
      verifiedAt: verifiedAt(5),
      title: 'Salle événementielle à Montmartre',
      description:
        'Salle indépendante avec jardin, à deux pas du Sacré-Cœur. Un lieu calme pour vos séminaires, ateliers et événements professionnels.',
      addressLine1: '8 Rue Lepic',
      city: 'Paris',
      postalCode: '75018',
      country: 'FR',
      latitude: 48.8867,
      longitude: 2.3431,
      maxGuests: 30,
      pricingUnit: 'HOUR',
      basePrice: 80,
      cleaningFee: 40,
      depositAmount: 300,
      cancellationPolicy: 'STRICT',
      instantBookEnabled: true,
      amenities: ['wifi', 'kitchen', 'heating', 'projector'],
      specificAttributes: { surface_m2: 90, capacity_persons: 30 },
    },
  });

  // ── Lyon — Lucas (host2) ──────────────────────────────────────────────────
  const workshop = await prisma.listing.create({
    data: {
      hostId: host2.id,
      type: 'WORKSHOP',
      status: 'PUBLISHED',
      title: 'Atelier créatif Croix-Rousse',
      description:
        "Grand atelier baigné de lumière naturelle sur les pentes de la Croix-Rousse, idéal pour la peinture, la céramique ou tout travail manuel salissant.",
      addressLine1: '12 Rue des Tables Claudiennes',
      city: 'Lyon',
      postalCode: '69004',
      country: 'FR',
      latitude: 45.7776,
      longitude: 4.83,
      maxGuests: 8,
      pricingUnit: 'HOUR',
      basePrice: 28,
      cancellationPolicy: 'FLEXIBLE',
      instantBookEnabled: false,
      activityValidationRequired: true,
      amenities: ['wifi', 'tools', 'ventilation'],
      specificAttributes: { surface_m2: 60 },
    },
  });

  const shop = await prisma.listing.create({
    data: {
      hostId: host2.id,
      type: 'SHOP',
      status: 'PUBLISHED',
      verifiedAt: verifiedAt(21),
      title: 'Boutique éphémère Presqu\'île',
      description:
        'Boutique de 70m² avec vitrine sur rue, briques apparentes et verrière. Idéale pour une vente éphémère ou une présentation de collection.',
      addressLine1: '5 Rue de la République',
      city: 'Lyon',
      postalCode: '69002',
      country: 'FR',
      latitude: 45.7597,
      longitude: 4.8422,
      maxGuests: 20,
      pricingUnit: 'HOUR',
      basePrice: 35,
      cleaningFee: 30,
      cancellationPolicy: 'MODERATE',
      instantBookEnabled: true,
      amenities: ['wifi', 'heating', 'wheelchair-access'],
      specificAttributes: { surface_m2: 70, floor: 0 },
    },
  });

  // ── Marseille — Camille (host3) ───────────────────────────────────────────
  const cabinet = await prisma.listing.create({
    data: {
      hostId: host3.id,
      type: 'PRACTICE_ROOM',
      status: 'PUBLISHED',
      title: 'Cabinet paramédical Vieux-Port',
      description:
        "Cabinet équipé pour profession paramédicale, salle d'attente partagée, à deux pas du Vieux-Port.",
      addressLine1: '20 Quai du Port',
      city: 'Marseille',
      postalCode: '13002',
      country: 'FR',
      latitude: 43.2951,
      longitude: 5.3739,
      maxGuests: 2,
      pricingUnit: 'HOUR',
      basePrice: 22,
      cancellationPolicy: 'STRICT',
      instantBookEnabled: false,
      rcProRequired: true,
      amenities: ['wifi', 'waiting-room', 'sink'],
      specificAttributes: { surface_m2: 16 },
    },
  });

  const restaurant = await prisma.listing.create({
    data: {
      hostId: host3.id,
      type: 'RESTAURANT',
      status: 'PUBLISHED',
      verifiedAt: verifiedAt(9),
      title: 'Restaurant privatisable Saint-Charles',
      description:
        'Salle de restaurant à 5 minutes à pied de la gare Saint-Charles. Cuisine équipée et espace convivial pour vos repas et événements professionnels.',
      addressLine1: '1 Boulevard Voltaire',
      city: 'Marseille',
      postalCode: '13001',
      country: 'FR',
      latitude: 43.3038,
      longitude: 5.3805,
      maxGuests: 40,
      pricingUnit: 'HOUR',
      basePrice: 65,
      cancellationPolicy: 'FLEXIBLE',
      instantBookEnabled: true,
      accessMethod: 'RECEPTION',
      accessInstructions: "Présentez votre réservation à l'accueil du restaurant.",
      amenities: ['wifi', 'kitchen', 'ac'],
      specificAttributes: { surface_m2: 100, capacity_persons: 40 },
    },
  });

  await ensurePhotos(creativeStudio.id, 'CREATIVE_PHOTO', 1);
  await ensurePhotos(meetingRoom.id, 'MEETING_ROOM_EQUIPPED', 1);
  await ensurePhotos(office.id, 'OFFICE_PRIVATE', 0);
  await ensurePhotos(eventSpace.id, 'EVENT_RECEPTION', 0);
  await ensurePhotos(workshop.id, 'WORKSHOP_CREATIVE', 0);
  await ensurePhotos(shop.id, 'SHOP_POPUP', 0);
  await ensurePhotos(cabinet.id, 'PRACTICE_PARAMEDICAL', 0);
  await ensurePhotos(restaurant.id, 'RESTAURANT_PRIVATE', 0);
  console.log('✓ 8 annonces vedettes seedées (3 villes, 5 vérifiées, 3 non vérifiées) + photos + FAQ');

  // Catalogue de remplissage pour atteindre un volume crédible (recherche,
  // pagination, filtres) — 16 hôtes "filler-host-*", avec historique et avis.
  const FILLER_COUNT = 96;
  const fillerCreated = await generateFillerListings(FILLER_COUNT, hashedPassword);
  console.log(`✓ ${fillerCreated} annonces de remplissage générées (16 hôtes supplémentaires)`);

  // ── Réservations + avis + encaissements ──────────────────────────────────
  // Historique (COMPLETED) : sert à peupler les notes affichées sur les
  // annonces. À venir/En attente/Annulée sur le compte tenant@aven.dev pour
  // couvrir tous les onglets de /bookings et /host/reservations.

  async function seedCompletedWithReview(opts: {
    listingId: string;
    hostId: string;
    tenantId: string;
    startAt: Date;
    endAt: Date;
    unitCount: number;
    basePrice: number;
    cleaningFee?: number;
    rating: number;
    comment: string;
  }) {
    const amounts = pricing(opts.basePrice, opts.unitCount, opts.cleaningFee ?? 0);
    const booking = await prisma.booking.create({
      data: {
        listingId: opts.listingId,
        tenantId: opts.tenantId,
        status: 'COMPLETED',
        startAt: opts.startAt,
        endAt: opts.endAt,
        unitCount: opts.unitCount,
        guestCount: 1,
        houseRulesAccepted: true,
        ...amounts,
      },
    });
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        status: 'CAPTURED',
        amount: amounts.totalAmount,
        platformFee: amounts.serviceFee,
        hostPayout: round2(amounts.totalAmount - amounts.serviceFee),
        capturedAt: opts.endAt,
      },
    });
    await prisma.review.create({
      data: {
        bookingId: booking.id,
        authorId: opts.tenantId,
        target: 'LISTING',
        rating: opts.rating,
        comment: opts.comment,
        listingId: opts.listingId,
      },
    });
    return booking;
  }

  // Le compte de test principal (tenant@aven.dev) : un historique complet.
  await seedCompletedWithReview({
    listingId: meetingRoom.id,
    hostId: host.id,
    tenantId: tenant.id,
    startAt: atDay(-10, 10),
    endAt: atDay(-10, 12),
    unitCount: 2,
    basePrice: 45,
    rating: 5,
    comment: 'Salle impeccable, tout fonctionnait, hôte très réactive.',
  }).then(async (booking) => {
    await prisma.deposit.create({
      data: {
        bookingId: booking.id,
        status: 'RELEASED',
        amount: 200,
        authorizedAt: atDay(-10, 9),
        releasedAt: atDay(-8, 9),
      },
    });
  });

  const upcomingEvent = pricing(80, 2, 40);
  await prisma.booking.create({
    data: {
      listingId: eventSpace.id,
      tenantId: tenant.id,
      status: 'CONFIRMED',
      startAt: atDay(6, 14),
      endAt: atDay(6, 16),
      unitCount: 2,
      guestCount: 2,
      houseRulesAccepted: true,
      ...upcomingEvent,
    },
  }).then(async (booking) => {
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        status: 'CAPTURED',
        amount: upcomingEvent.totalAmount,
        platformFee: upcomingEvent.serviceFee,
        hostPayout: round2(upcomingEvent.totalAmount - upcomingEvent.serviceFee),
        capturedAt: atDay(-1, 9),
      },
    });
  });

  const pendingStudio = pricing(40, 2, 25);
  await prisma.booking.create({
    data: {
      listingId: creativeStudio.id,
      tenantId: tenant.id,
      status: 'PENDING',
      startAt: atDay(12, 13),
      endAt: atDay(12, 15),
      unitCount: 2,
      guestCount: 2,
      houseRulesAccepted: true,
      hostApprovalDeadline: atDay(1, 15),
      ...pendingStudio,
    },
  });

  const cancelledOffice = pricing(18, 1);
  await prisma.booking.create({
    data: {
      listingId: office.id,
      tenantId: tenant.id,
      status: 'CANCELLED',
      startAt: atDay(-8, 9),
      endAt: atDay(-8, 10),
      unitCount: 1,
      guestCount: 1,
      houseRulesAccepted: true,
      ...cancelledOffice,
    },
  });

  // Avis d'autres locataires, pour que la note affichée sur chaque annonce ne
  // dépende pas uniquement du compte de test tenant@aven.dev.
  await seedCompletedWithReview({
    listingId: meetingRoom.id,
    hostId: host.id,
    tenantId: reviewer1.id,
    startAt: atDay(-25, 14),
    endAt: addHours(atDay(-25, 14), 1),
    unitCount: 1,
    basePrice: 45,
    rating: 4,
    comment: 'Bien situé, un peu bruyant côté avenue, mais très fonctionnel.',
  });

  await seedCompletedWithReview({
    listingId: creativeStudio.id,
    hostId: host.id,
    tenantId: reviewer2.id,
    startAt: atDay(-20, 9),
    endAt: atDay(-20, 12),
    unitCount: 3,
    basePrice: 40,
    cleaningFee: 25,
    rating: 5,
    comment: 'Studio lumineux, matériel photo en très bon état et emplacement pratique.',
  });

  await seedCompletedWithReview({
    listingId: office.id,
    hostId: host.id,
    tenantId: reviewer1.id,
    startAt: atDay(-15, 9),
    endAt: addHours(atDay(-15, 9), 3),
    unitCount: 3,
    basePrice: 18,
    rating: 4,
    comment: 'Bureau calme et lumineux, parfait pour recevoir un client.',
  });

  await seedCompletedWithReview({
    listingId: eventSpace.id,
    hostId: host.id,
    tenantId: reviewer2.id,
    startAt: atDay(-18, 13),
    endAt: atDay(-18, 15),
    unitCount: 2,
    basePrice: 80,
    cleaningFee: 40,
    rating: 5,
    comment: 'Un cadre calme et agréable pour notre séminaire, à deux pas du Sacré-Cœur.',
  });

  await seedCompletedWithReview({
    listingId: shop.id,
    hostId: host2.id,
    tenantId: reviewer1.id,
    startAt: atDay(-12, 9),
    endAt: atDay(-12, 13),
    unitCount: 4,
    basePrice: 35,
    cleaningFee: 30,
    rating: 3,
    comment: 'Correct mais chauffage capricieux, sinon très bien situé.',
  });

  await seedCompletedWithReview({
    listingId: restaurant.id,
    hostId: host3.id,
    tenantId: reviewer2.id,
    startAt: atDay(-7, 10),
    endAt: atDay(-7, 12),
    unitCount: 2,
    basePrice: 65,
    rating: 5,
    comment: "Très bon accueil pour notre repas d'équipe, facile d'accès depuis la gare.",
  });

  console.log('✓ Réservations, avis et encaissements de démo seedés');

  // ── Module Commercial : un établissement + une invitation d'hôte ─────────
  const establishment = await prisma.establishment.upsert({
    where: { id: '9e5f9c2e-9e2a-4b7e-8a2a-1a9b6f5c3d10' },
    update: {},
    create: {
      id: '9e5f9c2e-9e2a-4b7e-8a2a-1a9b6f5c3d10',
      hostId: host.id,
      createdById: commercial.id,
      name: 'Immeuble Champs-Élysées',
      addressLine1: '45 Avenue des Champs-Élysées',
      city: 'Paris',
      postalCode: '75008',
      country: 'FR',
      latitude: 48.8698,
      longitude: 2.3078,
    },
  });

  await prisma.hostInvitation.upsert({
    where: { token: 'seed-demo-invitation-token' },
    update: {},
    create: {
      establishmentId: establishment.id,
      commercialId: commercial.id,
      hostEmail: 'nouvel-hote@aven.dev',
      hostFirstName: 'Karim',
      hostLastName: 'Belkacem',
      token: 'seed-demo-invitation-token',
      status: 'SENT',
    },
  });
  console.log(
    "✓ Module Commercial seeded (établissement + invitation de démo, token 'seed-demo-invitation-token')",
  );

  console.log('\n✓ Données de démo préparées');
  console.log('\nComptes principaux (mot de passe unique) :');
  console.log('  Hôte       → host@aven.dev       / Password123!  (Marie Dupont, Paris — 4 annonces)');
  console.log('  Locataire  → tenant@aven.dev     / Password123!  (Jean Martin — historique + résa en cours)');
  console.log('  Commercial → commercial@aven.dev / Password123!  (Sofia Nguyen)');
  console.log('  Admin      → admin@aven.dev      / Password123!  (accès /admin, seul compte à activer/désactiver les features)');
  console.log(`  Modération → ${moderator.email} / Password123!  (peut modifier/archiver/supprimer n'importe quelle annonce — le rôle COMMERCIAL a aussi ce droit pour le moment)`);
  console.log('\nComptes secondaires (même mot de passe, pour la variété du catalogue) :');
  console.log('  host2@aven.dev (Lucas Bernard, Lyon) · host3@aven.dev (Camille Rousseau, Marseille)');
  console.log('  reviewer1@aven.dev (Sophie Lambert) · reviewer2@aven.dev (Nicolas Petit) — auteurs des avis');
  console.log(`\n${8 + fillerCreated} annonces au total (8 vedettes + ${fillerCreated} de remplissage sur 10 villes).`);
  console.log('\nAnnonces vedettes (avec avis/FAQ/réservations) :');
  console.log(`  Paris     ✓ vérifiée   — Salle de réunion moderne 12 personnes (${meetingRoom.id})`);
  console.log(`  Paris     ✓ vérifiée   — Bureau lumineux Bastille (${office.id})`);
  console.log(`  Paris     ✓ vérifiée   — Salle événementielle à Montmartre (${eventSpace.id})`);
  console.log(`  Paris     · non vérif. — Studio photo lumineux dans le Marais (${creativeStudio.id})`);
  console.log(`  Lyon      ✓ vérifiée   — Boutique éphémère Presqu'île (${shop.id})`);
  console.log(`  Lyon      · non vérif. — Atelier créatif Croix-Rousse (${workshop.id})`);
  console.log(`  Marseille ✓ vérifiée   — Restaurant privatisable Saint-Charles (${restaurant.id})`);
  console.log(`  Marseille · non vérif. — Cabinet paramédical Vieux-Port (${cabinet.id})`);
  console.log('\nCompte tenant@aven.dev : 1 réservation terminée (avis laissé), 1 confirmée à venir,');
  console.log('1 en attente de validation hôte, 1 annulée — de quoi voir tous les états dans /bookings.');
  console.log('\nInvitation hôte de démo : /invitation/seed-demo-invitation-token');
  console.log(`\nCompte admin prêt : ${admin.email} (rôle ${admin.roles.join(', ')}).`);
}

async function main() {
  await client.$transaction(async (tx) => {
    prisma = tx;
    await prisma.$executeRaw`SELECT pg_advisory_xact_lock(20260920, 1)`;

    // Ce seed remplace le catalogue entier : refuser une base devenue réelle.
    const demoEmail = /^(host[23]?|tenant|reviewer[12]|commercial|admin|moderator|filler-host-\d{2}|filler-reviewer-\d{2})@aven\.dev$/;
    const users = await prisma.user.findMany({ select: { email: true } });
    if (users.some((user) => !demoEmail.test(user.email))) {
      throw new Error('Seed annulé : la base contient des comptes non-démo.');
    }
    const stripePayments = await prisma.payment.count({
      where: { stripePaymentIntentId: { not: null } },
    });
    if (stripePayments > 0) {
      throw new Error('Seed annulé : la base contient des paiements Stripe.');
    }

    const state = await prisma.featureFlagState.findUnique({ where: { id: 'default' } });
    const configuredTypes = (state?.flags as { enabledListingTypes?: string[] } | undefined)?.enabledListingTypes;
    if (configuredTypes && TYPE_TEMPLATES.some((tpl) => !configuredTypes.includes(tpl.type))) {
      throw new Error('Seed annulé : les catégories de démo ne correspondent pas aux types activés.');
    }

    await seed();
  }, { timeout: 300_000 });
  console.log('\n✅ Seed terminé et transaction validée !');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.$disconnect());
