-- AlterEnum: aligne ListingType sur le périmètre produit réel (espaces
-- professionnels uniquement) — retrait du résidentiel/stockage (APARTMENT,
-- HOUSE, ROOM, WAREHOUSE, PARKING), ajout de TRAINING_ROOM ("Salle de
-- formation", présent dans le design de référence).
--
-- Pré-requis : aucune ligne "Listing" ne doit référencer une valeur retirée
-- (APARTMENT/HOUSE/ROOM/WAREHOUSE/PARKING) au moment d'appliquer ce script —
-- les migrer vers un type valide avant, sinon l'ALTER COLUMN échoue.
CREATE TYPE "ListingType_new" AS ENUM (
  'OFFICE',
  'MEETING_ROOM',
  'TRAINING_ROOM',
  'WORKSHOP',
  'EVENT_SPACE',
  'BOUTIQUE',
  'CABINET',
  'RESTAURANT',
  'DESK',
  'CREATIVE_STUDIO',
  'OTHER'
);

ALTER TABLE "Listing" ALTER COLUMN "type" TYPE "ListingType_new" USING ("type"::text::"ListingType_new");

DROP TYPE "ListingType";
ALTER TYPE "ListingType_new" RENAME TO "ListingType";
