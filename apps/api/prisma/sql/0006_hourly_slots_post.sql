-- Migration manuelle 0006 (PARTIE 2/2 — À EXÉCUTER APRÈS `prisma db push`).
--
-- Recrée l'anti-double-booking en tstzrange (granularité horaire) — équivalent
-- du daterange de 0003_booking_constraints.sql, maintenant que Booking.startAt/
-- endAt sont des timestamptz.

ALTER TABLE "Booking"
  ADD CONSTRAINT booking_date_order
  CHECK ("startAt" < "endAt");

-- PostgreSQL marque le constructeur natif tstzrange() comme STABLE (pas IMMUTABLE),
-- ce qui est refusé dans une expression d'index/EXCLUDE. On passe par un wrapper
-- explicitement IMMUTABLE — les bornes sont déjà des instants UTC, la conversion
-- d'affichage par fuseau n'entre pas en jeu dans la comparaison de chevauchement.
-- Le wrapper doit être en plpgsql (pas en SQL) : une fonction SQL à une seule
-- instruction est "inlinée" par le planificateur, ce qui réexpose directement
-- l'appel STABLE à tstzrange() et fait échouer la contrainte avec la même erreur.
CREATE OR REPLACE FUNCTION immutable_tstzrange(timestamptz, timestamptz, text)
RETURNS tstzrange AS $$
BEGIN
  RETURN tstzrange($1, $2, $3);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

ALTER TABLE "Booking"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "listingId" WITH =,
    immutable_tstzrange("startAt", "endAt", '[)') WITH &&
  )
  WHERE (status IN ('PENDING', 'CONFIRMED'));
