import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { photosForType } from './photo-catalog';

const prisma = new PrismaClient();

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

async function main() {
  console.log('🌱 Seeding database...');

  // Seed PlatformConfig singleton
  await prisma.platformConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      serviceFeeRate: 0.12,
      taxRate: 0.20,
      currency: 'EUR',
      hostApprovalWindowHours: 24,
    },
  });
  console.log('✓ PlatformConfig seeded');

  // Seed users
  const hashedPassword = await bcrypt.hash('Password123!', 12);

  const host = await prisma.user.upsert({
    where: { email: 'host@aven.dev' },
    update: {},
    create: {
      email: 'host@aven.dev',
      hashedPassword,
      firstName: 'Marie',
      lastName: 'Dupont',
      roles: ['HOST', 'TENANT'],
    },
  });

  const tenant = await prisma.user.upsert({
    where: { email: 'tenant@aven.dev' },
    update: {},
    create: {
      email: 'tenant@aven.dev',
      hashedPassword,
      firstName: 'Jean',
      lastName: 'Martin',
      roles: ['TENANT'],
    },
  });
  console.log('✓ Users seeded (host@aven.dev / tenant@aven.dev — Password123!)');

  // Seed listing (Paris — Marais)
  const listing = await prisma.listing.upsert({
    where: { id: '72d60f9a-8528-49e5-a911-7a2a546c3906' },
    update: {},
    create: {
      id: '72d60f9a-8528-49e5-a911-7a2a546c3906',
      hostId: host.id,
      type: 'CREATIVE_STUDIO',
      status: 'PUBLISHED',
      title: 'Studio créatif lumineux dans le Marais',
      description:
        'Studio baigné de lumière naturelle de 45m² au cœur du Marais. Parquet, hauteur sous plafond 3m, coin kitchenette. Idéal pour shootings, ateliers créatifs et petits tournages.',
      addressLine1: '12 Rue des Rosiers',
      city: 'Paris',
      postalCode: '75004',
      country: 'FR',
      latitude: 48.8566,
      longitude: 2.3522,
      maxGuests: 8,
      pricingUnit: 'DAY',
      basePrice: 120,
      cleaningFee: 25,
      cancellationPolicy: 'MODERATE',
      instantBookEnabled: true,
      amenities: ['wifi', 'heating', 'kitchen'],
      specificAttributes: { naturalLight: true, floor: 3, elevator: true },
    },
  });

  // Seed listing (Paris — bureau, facturation à l'heure)
  const meetingRoom = await prisma.listing.upsert({
    where: { id: 'fabcc917-94cb-46fa-9d62-00d80f9a6035' },
    update: {},
    create: {
      id: 'fabcc917-94cb-46fa-9d62-00d80f9a6035',
      hostId: host.id,
      type: 'MEETING_ROOM',
      status: 'PUBLISHED',
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
      rcProRequired: true,
      houseRules:
        'Non-fumeur. Interdiction de déplacer le mobilier fixe. Nettoyage sommaire demandé après usage.',
      faq: [
        { question: 'Y a-t-il un vidéoprojecteur ?', reponse: 'Oui, avec câble HDMI et adaptateur USB-C fournis.' },
        { question: 'Le café est-il inclus ?', reponse: 'Oui, une machine à café en libre-service est à disposition.' },
      ],
      amenities: ['wifi', 'projector', 'whiteboard', 'ac', 'coffee'],
      specificAttributes: { projector: true, whiteboard: true, capacity_persons: 12 },
    },
  });

  // Créneaux horaires : lun-ven 8h-19h, tranches d'1h.
  for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) {
    const existing = await prisma.listingAvailabilityRule.findFirst({
      where: { listingId: meetingRoom.id, dayOfWeek },
    });
    if (existing) continue;
    await prisma.listingAvailabilityRule.create({
      data: {
        listingId: meetingRoom.id,
        dayOfWeek,
        startTime: '08:00',
        endTime: '19:00',
        minDurationMinutes: 60,
        minLeadTimeMinutes: 60,
      },
    });
  }

  await ensurePhotos(listing.id, 'CREATIVE_STUDIO', 0);
  await ensurePhotos(meetingRoom.id, 'MEETING_ROOM', 1);
  console.log('✓ Listings + photos + créneaux horaires seedés');

  console.log('\n✅ Seed terminé !');
  console.log('\nComptes de test :');
  console.log('  Hôte    → host@aven.dev   / Password123!');
  console.log('  Locataire → tenant@aven.dev / Password123!');
  console.log(`\nListing publié ID: ${listing.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
