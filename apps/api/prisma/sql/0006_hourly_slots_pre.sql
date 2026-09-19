-- Migration manuelle 0006 (PARTIE 1/2 — À EXÉCUTER AVANT `prisma db push`).
--
-- Passage de la réservation par plage de dates à la réservation par créneau
-- horaire (Booking/ListingAvailability : startDate/endDate en date → startAt/
-- endAt en timestamptz). Une contrainte existante dépend de ces colonnes ;
-- `prisma db push` ne peut pas les retyper tant qu'elle existe.
--
-- ⚠️ Environnement de développement uniquement : vide les tables dérivées
-- d'une réservation (données de démo construites sur l'ancien modèle en jours
-- entiers, sans valeur à migrer). Relancer `pnpm db:seed` après la partie 2.

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS booking_no_overlap;
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS booking_date_order;
DROP INDEX IF EXISTS "Booking_listingId_startDate_endDate_idx";

TRUNCATE TABLE "Review" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Message" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Conversation" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Deposit" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Payment" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "Booking" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "ListingAvailability" RESTART IDENTITY CASCADE;
