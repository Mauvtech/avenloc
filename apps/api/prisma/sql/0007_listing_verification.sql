-- Verification belongs to the space, not its host or publication status.
-- Existing spaces remain unverified until an actual review is recorded.
-- This field is deliberately absent from host/commercial write DTOs.
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMPTZ;
