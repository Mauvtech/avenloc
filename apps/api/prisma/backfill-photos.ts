import { PrismaClient } from '@prisma/client';
import { photosForType } from './photo-catalog';

const prisma = new PrismaClient();

/**
 * Ajoute des photos de démonstration à toutes les annonces PUBLISHED qui n'en
 * ont pas encore. Idempotent : ne touche pas aux annonces déjà illustrées.
 */
async function main() {
  const listings = await prisma.listing.findMany({
    where: { status: 'PUBLISHED' },
    select: { id: true, type: true, _count: { select: { photos: true } } },
    orderBy: { createdAt: 'asc' },
  });

  let filled = 0;
  for (let i = 0; i < listings.length; i++) {
    const l = listings[i];
    if (l._count.photos > 0) continue;
    const urls = photosForType(l.type, i);
    await prisma.listingPhoto.createMany({
      data: urls.map((url, position) => ({ listingId: l.id, url, position })),
    });
    filled++;
  }

  console.log(`✓ Photos ajoutées à ${filled} annonce(s) (sur ${listings.length} publiées).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
