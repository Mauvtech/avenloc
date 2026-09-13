-- Migration manuelle 0005 : caution (empreinte bancaire) — voir note-technique-caution.md.
-- À exécuter après la création des tables Listing/Booking par Prisma.

-- 1. Type énuméré du cycle de vie de la caution.
DO $$ BEGIN
  CREATE TYPE "DepositStatus" AS ENUM (
    'AUTHORIZED',
    'CAPTURE_REQUESTED',
    'CAPTURED',
    'CONTESTED',
    'RELEASED',
    'EXPIRED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Montant de caution demandé par l'hôte sur l'annonce (null = aucune caution).
ALTER TABLE "Listing"
  ADD COLUMN IF NOT EXISTS "depositAmount" DECIMAL(10, 2);

-- 3. Table Deposit — une ligne par réservation ayant une caution active.
CREATE TABLE IF NOT EXISTS "Deposit" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bookingId" UUID NOT NULL UNIQUE REFERENCES "Booking"(id) ON DELETE CASCADE,
  status "DepositStatus" NOT NULL DEFAULT 'AUTHORIZED',
  amount DECIMAL(10, 2) NOT NULL,

  "stripePaymentIntentId" TEXT UNIQUE,
  "authorizedAt" TIMESTAMPTZ,
  "expiresAt" TIMESTAMPTZ,

  "captureReason" TEXT,
  "captureRequestedAt" TIMESTAMPTZ,
  "proofUrls" TEXT[] NOT NULL DEFAULT '{}',

  "capturedAmount" DECIMAL(10, 2),
  "capturedAt" TIMESTAMPTZ,
  "contestReason" TEXT,
  "contestedAt" TIMESTAMPTZ,
  "releasedAt" TIMESTAMPTZ,

  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deposit_status_idx ON "Deposit" (status);
