-- Migration manuelle 0004 : instant book + config history
-- À exécuter après prisma migrate dev (tables Listing, Booking, PlatformConfig existantes).

-- 1. Listing : colonne instantBookEnabled (déjà gérée par Prisma Migrate si schema.prisma
--    est à jour — cette section documente l'intention pour les envs où Prisma est en mode
--    shadow database uniquement)
-- ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "instantBookEnabled" BOOLEAN NOT NULL DEFAULT false;

-- 2. Booking : colonne hostApprovalDeadline
-- ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "hostApprovalDeadline" TIMESTAMPTZ;

-- 3. PlatformConfig : colonne hostApprovalWindowHours
-- ALTER TABLE "PlatformConfig" ADD COLUMN IF NOT EXISTS "hostApprovalWindowHours" INTEGER NOT NULL DEFAULT 24;

-- 4. Contrainte CHECK : hostApprovalWindowHours ne peut pas dépasser 144h (6 jours)
--    pour rester dans la fenêtre d'autorisation Stripe de 7 jours avec marge.
ALTER TABLE "PlatformConfig"
  ADD CONSTRAINT platform_config_approval_window_max
  CHECK ("hostApprovalWindowHours" BETWEEN 1 AND 144);

-- 5. Index sur Booking.hostApprovalDeadline pour le job de nettoyage
--    (requête : WHERE status = 'PENDING' AND hostApprovalDeadline < now())
CREATE INDEX IF NOT EXISTS booking_pending_deadline_idx
  ON "Booking" ("hostApprovalDeadline")
  WHERE (status = 'PENDING' AND "hostApprovalDeadline" IS NOT NULL);

-- 6. Seed de la ligne PlatformConfig par défaut si elle n'existe pas
INSERT INTO "PlatformConfig" (id, "serviceFeeRate", "taxRate", currency, "hostApprovalWindowHours", "updatedAt")
VALUES ('default', 0.1200, 0.2000, 'EUR', 24, NOW())
ON CONFLICT (id) DO NOTHING;
