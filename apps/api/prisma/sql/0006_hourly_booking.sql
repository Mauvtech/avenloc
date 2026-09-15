-- Migration manuelle 0006 : support des réservations à l'heure (pricingUnit = HOUR)
-- À exécuter après `pnpm db:migrate` (qui a changé Booking.startDate/endDate
-- de `date` à `timestamp` suite à la mise à jour du schéma Prisma).

-- 1. Retirer l'ancienne contrainte d'exclusion posée en 0003 : elle utilisait
--    daterange("startDate"::date, "endDate"::date, '[)'), ce qui tronque l'heure
--    et considérerait deux réservations le même jour sur des créneaux distincts
--    (ex. 9h-11h et 14h-16h) comme un chevauchement — inacceptable pour du horaire.
ALTER TABLE "Booking"
  DROP CONSTRAINT IF EXISTS booking_no_overlap;

-- 2. Recréer la contrainte avec tsrange (timestamp range) au lieu de daterange.
--    Pour les annonces NIGHT/DAY, startDate/endDate sont posées à minuit par le
--    front (convention conservée) : le comportement est donc strictement identique
--    à l'ancienne contrainte daterange pour ces cas-là. Pour HOUR, la comparaison
--    se fait désormais à l'heure près.
ALTER TABLE "Booking"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "listingId" WITH =,
    tsrange("startDate", "endDate", '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));

-- ── Notes ────────────────────────────────────────────────────────────────────
-- La contrainte CHECK booking_date_order (0003) reste valable telle quelle :
-- la comparaison "startDate" < "endDate" fonctionne identiquement sur des
-- timestamps et n'a pas besoin d'être recréée.
--
-- Le générateur de créneaux (ListingAvailabilityRule, voir schema.prisma) est
-- une table Prisma standard, créée automatiquement par `pnpm db:migrate` —
-- aucune action manuelle nécessaire pour celle-ci.
--
-- Rappel de l'ordre d'exécution complet (voir aussi ARCHITECTURE.md §9) :
--   1. docker compose up postgres
--   2. psql ... -f prisma/sql/0001_extensions.sql
--   3. pnpm db:migrate   (crée/altère les tables, y compris ce changement de type)
--   4. psql ... -f prisma/sql/0002_postgis_geometry.sql
--   5. psql ... -f prisma/sql/0003_booking_constraints.sql   (si base neuve)
--   6. psql ... -f prisma/sql/0004_instant_book.sql
--   7. psql ... -f prisma/sql/0005_deposit.sql
--   8. psql ... -f prisma/sql/0006_hourly_booking.sql        (ce fichier — toujours après 0003)
