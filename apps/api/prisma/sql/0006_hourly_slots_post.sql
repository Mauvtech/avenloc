-- Hourly constraints: run after 0006_hourly_slots_upgrade.sql in one transaction.
--
-- Recrée l'anti-double-booking en tstzrange (granularité horaire) — équivalent
-- du daterange de 0003_booking_constraints.sql, maintenant que Booking.startAt/
-- endAt sont des timestamptz.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"Booking"'::regclass AND conname = 'booking_date_order') THEN
    ALTER TABLE "Booking" ADD CONSTRAINT booking_date_order CHECK ("startAt" < "endAt");
  END IF;
END $$;

-- Conserve le wrapper employé par les bases déjà migrées. Les arguments sont
-- des timestamptz : la plage compare des instants et reste indépendante du
-- fuseau d'affichage de la session.
CREATE OR REPLACE FUNCTION immutable_tstzrange(timestamptz, timestamptz, text)
RETURNS tstzrange AS $$
BEGIN
  RETURN tstzrange($1, $2, $3);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = '"Booking"'::regclass AND conname = 'booking_no_overlap') THEN
ALTER TABLE "Booking"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "listingId" WITH =,
    immutable_tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));

  END IF;
END $$;
