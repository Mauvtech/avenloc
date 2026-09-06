-- Migration manuelle 0003 : contraintes d'intégrité sur Booking
-- À exécuter après la création de la table "Booking" par Prisma.

-- 1. CHECK : endDate doit être strictement postérieure à startDate.
--    Défense en profondeur — la validation applicative (DTO) est la première ligne ;
--    cette contrainte empêche toute incohérence si un bug contourne les DTOs.
ALTER TABLE "Booking"
  ADD CONSTRAINT booking_date_order
  CHECK ("startDate" < "endDate");

-- 2. EXCLUDE USING gist : anti-double-booking au niveau base de données.
--
--    Garantit qu'aucune réservation PENDING ou CONFIRMED ne peut chevaucher
--    une autre sur le même local. La contrainte est partielle (WHERE) pour
--    exclure les réservations CANCELLED et COMPLETED qui ne bloquent plus le calendrier.
--
--    Requires : extension btree_gist (0001_extensions.sql) pour combiner
--    un opérateur d'égalité sur uuid (=) et un opérateur de chevauchement sur daterange (&&).
--
--    Convention : daterange('[)') = borne inférieure incluse, borne supérieure exclue,
--    cohérente avec la convention endDate exclusif du modèle.
ALTER TABLE "Booking"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "listingId" WITH =,
    daterange("startDate"::date, "endDate"::date, '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));

-- ── Notes d'utilisation ────────────────────────────────────────────────────────
-- Au niveau service, la création d'une réservation doit :
--   1. Ouvrir une transaction sérialisable (ou au moins REPEATABLE READ).
--   2. Poser un verrou consultatif ou un SELECT ... FOR UPDATE sur le listing
--      pour éviter les races entre la vérification de disponibilité et l'INSERT.
--   3. Laisser la contrainte EXCLUDE comme filet de sécurité final.
--
-- En cas de violation, PostgreSQL lève une erreur 23P01 (exclusion_violation)
-- que le service bookings doit intercepter et retourner en 409 Conflict.
