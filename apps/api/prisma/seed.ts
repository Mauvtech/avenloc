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

  const commercial = await prisma.user.upsert({
    where: { email: 'commercial@aven.dev' },
    update: {},
    create: {
      email: 'commercial@aven.dev',
      hashedPassword,
      firstName: 'Sofia',
      lastName: 'Nguyen',
      roles: ['COMMERCIAL', 'TENANT'],
    },
  });
  console.log(
    '✓ Users seeded (host@aven.dev / tenant@aven.dev / commercial@aven.dev — Password123!)',
  );

  // Seed listing (Paris — Marais)
  const listing = await prisma.listing.upsert({
    where: { id: '72d60f9a-8528-49e5-a911-7a2a546c3906' },
    update: {},
    create: {
      id: '72d60f9a-8528-49e5-a911-7a2a546c3906',
      hostId: host.id,
      type: 'APARTMENT',
      status: 'PUBLISHED',
      title: 'Bel appartement dans le Marais',
      description:
        'Appartement lumineux de 45m² au cœur du Marais. Parquet, hauteur sous plafond 3m, cuisine équipée. Idéal pour découvrir Paris à pied.',
      addressLine1: '12 Rue des Rosiers',
      city: 'Paris',
      postalCode: '75004',
      country: 'FR',
      latitude: 48.8566,
      longitude: 2.3522,
      maxGuests: 2,
      pricingUnit: 'NIGHT',
      basePrice: 120,
      cleaningFee: 25,
      cancellationPolicy: 'MODERATE',
      instantBookEnabled: true,
      amenities: ['wifi', 'kitchen', 'washer', 'heating'],
      specificAttributes: { floor: 3, elevator: true, balcony: false },
    },
  });

  // Seed listing (Paris — salle de réunion, créneaux horaires + conditions pro)
  const meetingRoomFields = {
    depositAmount: 200,
    openDays: [1, 2, 3, 4, 5],
    openStartTime: '08:00',
    openEndTime: '19:00',
    minDurationMinutes: 60,
    minNoticeHours: 2,
    accessMethod: 'ACCESS_CODE' as const,
    accessInstructions: 'Code porte : 4821A — valable pour la durée du créneau réservé.',
    rcProRequired: true,
    houseRules:
      'Non-fumeur. Interdiction de déplacer le mobilier fixe. Nettoyage sommaire demandé après usage. Toute dégradation sera facturée sur la caution.',
  };

  const meetingRoom = await prisma.listing.upsert({
    where: { id: 'fabcc917-94cb-46fa-9d62-00d80f9a6035' },
    update: meetingRoomFields,
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
      amenities: ['wifi', 'projector', 'whiteboard', 'ac', 'coffee'],
      specificAttributes: { projector: true, whiteboard: true, capacity_persons: 12 },
      ...meetingRoomFields,
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
    skipDuplicates: true,
  });

  await ensurePhotos(listing.id, 'APARTMENT', 0);
  await ensurePhotos(meetingRoom.id, 'MEETING_ROOM', 1);
  console.log('✓ Listings + photos + FAQ seeded');

  // Seed module Commercial : un établissement + une invitation d'hôte de démo
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

  console.log('\n✅ Seed terminé !');
  console.log('\nComptes de test :');
  console.log('  Hôte       → host@aven.dev       / Password123!');
  console.log('  Locataire  → tenant@aven.dev     / Password123!');
  console.log('  Commercial → commercial@aven.dev / Password123!');
  console.log(`\nListing publié ID: ${listing.id}`);
  console.log('Invitation hôte de démo : /invitation/seed-demo-invitation-token');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
