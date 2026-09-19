-- Production upgrade from the day-based schema to hourly slots + Commercial.
-- Run through scripts/release.sh: this file, the post constraints and the ledger
-- are committed together. No db push, TRUNCATE, DROP COLUMN or data reseeding.
-- Legacy calendar dates become midnight Europe/Paris (the application's booking
-- timezone); exclusive end dates and financial snapshots keep their meaning.
SELECT pg_advisory_xact_lock(20260919, 6);

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS booking_no_overlap;
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS booking_date_order;

DO $$
DECLARE
  table_name_to_migrate text;
  old_column text;
  new_column text;
  column_type text;
BEGIN
  FOREACH table_name_to_migrate IN ARRAY ARRAY['Booking', 'ListingAvailability'] LOOP
    FOREACH old_column IN ARRAY ARRAY['startDate', 'endDate'] LOOP
      new_column := CASE old_column WHEN 'startDate' THEN 'startAt' ELSE 'endAt' END;
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = table_name_to_migrate AND column_name = old_column) THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = table_name_to_migrate AND column_name = new_column) THEN
          RAISE EXCEPTION 'Ambiguous schema: %.% and % both exist; inspect before migrating', table_name_to_migrate, old_column, new_column;
        END IF;
        EXECUTE format('ALTER TABLE %I RENAME COLUMN %I TO %I', table_name_to_migrate, old_column, new_column);
      END IF;
      SELECT data_type INTO column_type FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = table_name_to_migrate AND column_name = new_column;
      IF column_type IN ('date', 'timestamp without time zone') THEN
        EXECUTE format('ALTER TABLE %I ALTER COLUMN %I TYPE timestamptz USING (%I::timestamp AT TIME ZONE %L)', table_name_to_migrate, new_column, new_column, 'Europe/Paris');
      ELSIF column_type IS DISTINCT FROM 'timestamp with time zone' THEN
        RAISE EXCEPTION 'Unsupported or missing column %.% (%)', table_name_to_migrate, new_column, column_type;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "AccessMethod" AS ENUM ('CONNECTED_LOCK', 'ACCESS_CODE', 'KEY_BOX', 'QR_CODE', 'RECEPTION');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "HostInvitationStatus" AS ENUM ('SENT', 'ACCEPTED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COMMERCIAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ListingType" ADD VALUE IF NOT EXISTS 'SHOP';
ALTER TYPE "ListingType" ADD VALUE IF NOT EXISTS 'PRACTICE_ROOM';
ALTER TYPE "ListingType" ADD VALUE IF NOT EXISTS 'RESTAURANT';
ALTER TYPE "ListingType" ADD VALUE IF NOT EXISTS 'CREATIVE_STUDIO';

-- AlterEnum
ALTER TYPE "ListingStatus" ADD VALUE IF NOT EXISTS 'PENDING_VALIDATION';

-- DropIndex
DROP INDEX IF EXISTS "Booking_listingId_startDate_endDate_idx";

-- AlterTable
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "accessInstructions" TEXT,
ADD COLUMN IF NOT EXISTS "accessMethod" "AccessMethod",
ADD COLUMN IF NOT EXISTS "activityValidationRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "establishmentId" UUID,
ADD COLUMN IF NOT EXISTS "houseRules" TEXT,
ADD COLUMN IF NOT EXISTS "minDurationMinutes" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN IF NOT EXISTS "minNoticeHours" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "openDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[],
ADD COLUMN IF NOT EXISTS "openEndTime" TEXT NOT NULL DEFAULT '19:00',
ADD COLUMN IF NOT EXISTS "openStartTime" TEXT NOT NULL DEFAULT '08:00',
ADD COLUMN IF NOT EXISTS "rcProRequired" BOOLEAN NOT NULL DEFAULT false;

-- Booking financial snapshots, IDs and linked records are left untouched.
ALTER TABLE "Booking"
  ADD COLUMN IF NOT EXISTS "activityDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "houseRulesAccepted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "rcProAccepted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "criteria" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ListingFaqItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listingId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListingFaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Establishment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "hostId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Establishment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "HostInvitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "establishmentId" UUID NOT NULL,
    "listingId" UUID,
    "commercialId" UUID NOT NULL,
    "status" "HostInvitationStatus" NOT NULL DEFAULT 'SENT',
    "hostEmail" TEXT NOT NULL,
    "hostFirstName" TEXT,
    "hostLastName" TEXT,
    "hostPhone" TEXT,
    "token" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HostInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ListingFaqItem_listingId_idx" ON "ListingFaqItem"("listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Establishment_hostId_idx" ON "Establishment"("hostId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Establishment_createdById_idx" ON "Establishment"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HostInvitation_token_key" ON "HostInvitation"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HostInvitation_establishmentId_idx" ON "HostInvitation"("establishmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HostInvitation_commercialId_idx" ON "HostInvitation"("commercialId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HostInvitation_hostEmail_idx" ON "HostInvitation"("hostEmail");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Listing_establishmentId_idx" ON "Listing"("establishmentId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Booking_listingId_startAt_endAt_idx" ON "Booking"("listingId", "startAt", "endAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"Listing"'::regclass AND conname = 'Listing_establishmentId_fkey') THEN
    ALTER TABLE "Listing" ADD CONSTRAINT "Listing_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"ListingFaqItem"'::regclass AND conname = 'ListingFaqItem_listingId_fkey') THEN
    ALTER TABLE "ListingFaqItem" ADD CONSTRAINT "ListingFaqItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"Establishment"'::regclass AND conname = 'Establishment_hostId_fkey') THEN
    ALTER TABLE "Establishment" ADD CONSTRAINT "Establishment_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"Establishment"'::regclass AND conname = 'Establishment_createdById_fkey') THEN
    ALTER TABLE "Establishment" ADD CONSTRAINT "Establishment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"HostInvitation"'::regclass AND conname = 'HostInvitation_establishmentId_fkey') THEN
    ALTER TABLE "HostInvitation" ADD CONSTRAINT "HostInvitation_establishmentId_fkey" FOREIGN KEY ("establishmentId") REFERENCES "Establishment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"HostInvitation"'::regclass AND conname = 'HostInvitation_listingId_fkey') THEN
    ALTER TABLE "HostInvitation" ADD CONSTRAINT "HostInvitation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"HostInvitation"'::regclass AND conname = 'HostInvitation_commercialId_fkey') THEN
    ALTER TABLE "HostInvitation" ADD CONSTRAINT "HostInvitation_commercialId_fkey" FOREIGN KEY ("commercialId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
