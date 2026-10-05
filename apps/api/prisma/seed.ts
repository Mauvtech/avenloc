import { createHash } from 'crypto';
import { PrismaClient, Prisma, PricingUnit, ListingType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PARTNER_SPACES, type PartnerSpace } from './partner-spaces';

const prisma = new PrismaClient();

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

const verifiedAt = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000);

/** UUID stable dérivé de l'identifiant partenaire : un re-seed redonne les mêmes
 * URLs d'annonces (/listings/<id>), au lieu de nouveaux identifiants à chaque fois. */
function stableId(key: string): string {
  const h = createHash('md5').update(`aven-seed:${key}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// RNG déterministe : le jeu d'avis est stable d'un `db:seed` à l'autre.
function mulberry32(seed: number) {
  let t = seed;
  return function random(): number {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261005);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rng() * arr.length)];

const REVIEW_COMMENTS = [
  'Espace conforme à la description, accès facile.',
  'Très bon rapport qualité-prix, je recommande.',
  "Hôte réactif, tout s'est bien passé.",
  'Propre, calme et bien situé, parfait pour travailler.',
  'Quelques détails à revoir mais globalement satisfait.',
  "Exactement ce qu'il me fallait pour mon équipe.",
  'Accueil chaleureux, équipement au top.',
  "Un peu bruyant aux heures de pointe mais l'espace reste agréable.",
  'Rien à redire, je reviendrai.',
  "Bon emplacement, facile d'accès en transport.",
];
const RATING_WEIGHTS = [3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 2];

// Les réservations de démo doivent respecter les horaires de l'annonce : on
// décale au jour ouvré le plus proche (dans le sens du temps) et on borne l'heure.
interface SlotListing {
  pricingUnit: PricingUnit;
  openDays: number[];
  openStartTime: string;
  openEndTime: string;
}

function slotFor(listing: SlotListing, offsetDays: number, hours = 2): { startAt: Date; endAt: Date; unitCount: number } {
  const step = offsetDays < 0 ? -1 : 1;
  let day = offsetDays;
  while (!listing.openDays.includes(atDay(day, 12).getUTCDay())) day += step;

  const [oh, om] = listing.openStartTime.split(':').map(Number);
  const [ch, cm] = listing.openEndTime.split(':').map(Number);
  if (listing.pricingUnit === PricingUnit.DAY) {
    // Une « journée » = toute la plage d'ouverture.
    return { startAt: atDay(day, oh, om), endAt: atDay(day, ch, cm), unitCount: 1 };
  }
  const startAt = atDay(day, oh + 1, om);
  return { startAt, endAt: new Date(startAt.getTime() + hours * 3_600_000), unitCount: hours };
}

async function main() {
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

  // Repart d'une base propre pour les annonces à chaque seed : CASCADE nettoie
  // photos/FAQ/réservations/paiements/avis/cautions/établissements/invitations
  // qui en dépendent. Users et PlatformConfig sont préservés (upsert au-dessus).
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "Listing", "Establishment", "HostInvitation" RESTART IDENTITY CASCADE;`,
  );
  console.log('✓ Anciennes annonces supprimées');

  // ── Catalogue : 40 espaces de nos partenaires ─────────────────────────────
  const hostIds: Record<PartnerSpace['host'], string> = {
    host: host.id, // Paris
    host2: host2.id, // autres villes de France
    host3: host3.id, // Espagne
  };

  const created: { space: PartnerSpace; listing: Awaited<ReturnType<typeof prisma.listing.create>> }[] = [];
  for (const [i, space] of PARTNER_SPACES.entries()) {
    const listing = await prisma.listing.create({
      data: {
        id: stableId(space.externalId),
        hostId: hostIds[space.host],
        type: ListingType.OFFICE,
        status: 'PUBLISHED',
        // Espaces validés côté partenaire : tous vérifiés, à des dates étalées.
        verifiedAt: verifiedAt(5 + ((i * 7) % 80)),
        title: space.title,
        description: space.description,
        addressLine1: space.addressLine1,
        addressLine2: space.addressLine2,
        city: space.city,
        postalCode: space.postalCode,
        country: space.country,
        latitude: space.latitude,
        longitude: space.longitude,
        maxGuests: space.maxGuests,
        pricingUnit: space.pricingUnit,
        basePrice: space.basePrice,
        cancellationPolicy: 'MODERATE',
        instantBookEnabled: space.instantBookEnabled,
        openDays: space.openDays,
        openStartTime: space.openStartTime,
        openEndTime: space.openEndTime,
        minDurationMinutes: space.minDurationMinutes,
        amenities: space.amenities,
        specificAttributes: space.specificAttributes as Prisma.InputJsonValue,
        photos: { create: space.photos.map((url, position) => ({ url, position })) },
      },
    });
    created.push({ space, listing });
  }
  const parisCount = created.filter((c) => c.space.city === 'Paris').length;
  console.log(
    `✓ ${created.length} espaces partenaires seedés (${parisCount} à Paris, ${created.length - parisCount} ailleurs) + ${created.reduce(
      (n, c) => n + c.space.photos.length,
      0,
    )} photos`,
  );

  // ── Réservations + avis + encaissements ──────────────────────────────────
  // Historique (COMPLETED) : sert à peupler les notes affichées. À venir /
  // En attente / Annulée sur tenant@aven.dev pour couvrir tous les onglets de
  // /bookings et /host/reservations. Chaque réservation de démo est sur une
  // annonce / un jour distinct : aucune collision avec les contraintes anti
  // double-réservation.
  type Created = (typeof created)[number];

  async function seedBooking(opts: {
    target: Created;
    tenantId: string;
    status: 'COMPLETED' | 'CONFIRMED' | 'PENDING' | 'CANCELLED';
    offsetDays: number;
    hours?: number;
    review?: { rating: number; comment: string };
  }) {
    const { listing, space } = opts.target;
    const slot = slotFor(listing, opts.offsetDays, opts.hours);
    const amounts = pricing(space.basePrice, slot.unitCount);
    const booking = await prisma.booking.create({
      data: {
        listingId: listing.id,
        tenantId: opts.tenantId,
        status: opts.status,
        startAt: slot.startAt,
        endAt: slot.endAt,
        unitCount: slot.unitCount,
        guestCount: 1,
        houseRulesAccepted: true,
        ...(opts.status === 'PENDING' && { hostApprovalDeadline: atDay(1, 15) }),
        ...amounts,
      },
    });
    if (opts.status === 'COMPLETED' || opts.status === 'CONFIRMED') {
      await prisma.payment.create({
        data: {
          bookingId: booking.id,
          status: 'CAPTURED',
          amount: amounts.totalAmount,
          platformFee: amounts.serviceFee,
          hostPayout: round2(amounts.totalAmount - amounts.serviceFee),
          capturedAt: opts.status === 'COMPLETED' ? slot.endAt : atDay(-1, 9),
        },
      });
    }
    if (opts.review) {
      await prisma.review.create({
        data: {
          bookingId: booking.id,
          authorId: opts.tenantId,
          target: 'LISTING',
          rating: opts.review.rating,
          comment: opts.review.comment,
          listingId: listing.id,
        },
      });
    }
    return booking;
  }

  // Le compte de test principal (tenant@aven.dev) : un historique complet, sur
  // quatre annonces horaires (les premières : à Paris, chez Marie Dupont).
  const hourly = created.filter((c) => c.listing.pricingUnit === PricingUnit.HOUR);
  const [h1, h2, h3, h4] = hourly;
  await seedBooking({
    target: h1,
    tenantId: tenant.id,
    status: 'COMPLETED',
    offsetDays: -10,
    review: { rating: 5, comment: 'Bureau impeccable, tout fonctionnait, hôte très réactif.' },
  });
  await seedBooking({ target: h2, tenantId: tenant.id, status: 'CONFIRMED', offsetDays: 6 });
  await seedBooking({ target: h3, tenantId: tenant.id, status: 'PENDING', offsetDays: 12 });
  await seedBooking({ target: h4, tenantId: tenant.id, status: 'CANCELLED', offsetDays: -8, hours: 1 });

  // Avis d'autres locataires : ~75 % des annonces ont 1 à 3 avis, pour que la
  // note affichée ne dépende pas du seul compte de test.
  let reviewCount = 0;
  for (const target of created) {
    if (rng() > 0.75) continue;
    const n = 1 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      await seedBooking({
        target,
        tenantId: k % 2 === 0 ? reviewer1.id : reviewer2.id,
        status: 'COMPLETED',
        offsetDays: -(20 + k * 5 + Math.floor(rng() * 3)),
        hours: 1 + Math.floor(rng() * 3),
        review: { rating: pick(RATING_WEIGHTS), comment: pick(REVIEW_COMMENTS) },
      });
      reviewCount++;
    }
  }
  console.log(`✓ Réservations de démo (4 sur tenant@aven.dev) et ${reviewCount} avis seedés`);

  // ── Module Commercial : un établissement + une invitation d'hôte ─────────
  const firstParis = created.find((c) => c.space.city === 'Paris')!;
  const establishment = await prisma.establishment.upsert({
    where: { id: '9e5f9c2e-9e2a-4b7e-8a2a-1a9b6f5c3d10' },
    update: {},
    create: {
      id: '9e5f9c2e-9e2a-4b7e-8a2a-1a9b6f5c3d10',
      hostId: host.id,
      createdById: commercial.id,
      name: firstParis.space.title,
      addressLine1: firstParis.space.addressLine1,
      city: firstParis.space.city,
      postalCode: firstParis.space.postalCode,
      country: firstParis.space.country,
      latitude: firstParis.space.latitude,
      longitude: firstParis.space.longitude,
    },
  });
  await prisma.listing.update({
    where: { id: firstParis.listing.id },
    data: { establishmentId: establishment.id },
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

  const instant = created.filter((c) => c.space.instantBookEnabled);
  const derived = created.filter((c) => c.space.specificAttributes['dailyPriceDerivedFromMonthly']);
  console.log('\n✅ Seed terminé !');
  console.log('\nComptes principaux (mot de passe unique) :');
  console.log(`  Hôte       → host@aven.dev       / Password123!  (Marie Dupont — espaces de Paris, ${created.filter((c) => c.space.host === 'host').length} annonces)`);
  console.log('  Locataire  → tenant@aven.dev     / Password123!  (Jean Martin — historique + résa en cours)');
  console.log('  Commercial → commercial@aven.dev / Password123!  (Sofia Nguyen)');
  console.log('  Admin      → admin@aven.dev      / Password123!  (accès /admin, seul compte à activer/désactiver les features)');
  console.log(`  Modération → ${moderator.email} / Password123!  (peut modifier/archiver/supprimer n'importe quelle annonce — le rôle COMMERCIAL a aussi ce droit pour le moment)`);
  console.log('\nComptes secondaires (même mot de passe) :');
  console.log(`  host2@aven.dev (Lucas Bernard — ${created.filter((c) => c.space.host === 'host2').length} annonces en France hors Paris) · host3@aven.dev (Camille Rousseau — ${created.filter((c) => c.space.host === 'host3').length} annonces à Barcelone)`);
  console.log('  reviewer1@aven.dev (Sophie Lambert) · reviewer2@aven.dev (Nicolas Petit) — auteurs des avis');
  console.log(`\n${created.length} annonces partenaires au total ; réservation instantanée : ${instant.length} (${instant.map((c) => c.space.title).join(', ') || 'aucune'}).`);
  console.log(`⚠ ${derived.length} annonces n'ont qu'un tarif mensuel chez le partenaire : leur tarif journalier est DÉRIVÉ (mensuel ÷ 22), le tarif d'origine est dans specificAttributes.priceMonth.`);
  console.log('\nCompte tenant@aven.dev : 1 réservation terminée (avis laissé), 1 confirmée à venir,');
  console.log('1 en attente de validation hôte, 1 annulée — de quoi voir tous les états dans /bookings.');
  console.log('\nInvitation hôte de démo : /invitation/seed-demo-invitation-token');
  console.log(`\nCompte admin prêt : ${admin.email} (rôle ${admin.roles.join(', ')}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
