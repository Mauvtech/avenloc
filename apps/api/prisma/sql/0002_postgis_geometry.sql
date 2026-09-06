-- Migration manuelle 0002 : colonne géométrique PostGIS sur Listing
-- À exécuter après la création de la table "Listing" par Prisma.
--
-- Stratégie : Prisma gère latitude/longitude (Float) comme source of truth côté ORM.
-- Cette migration ajoute une colonne `location geometry(Point, 4326)` maintenue
-- automatiquement par un trigger BEFORE INSERT OR UPDATE.
--
-- Recherche géospatiale : toujours via la colonne `location` (indexée GIST).
-- Mise à jour latitude/longitude : toujours via Prisma ORM → le trigger synchronise.

-- 1. Ajout de la colonne géométrique
ALTER TABLE "Listing"
  ADD COLUMN IF NOT EXISTS location geometry(Point, 4326);

-- 2. Backfill des lignes existantes
UPDATE "Listing"
SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE location IS NULL;

-- 3. Contrainte NOT NULL après backfill
ALTER TABLE "Listing"
  ALTER COLUMN location SET NOT NULL;

-- 4. Fonction trigger de synchronisation
CREATE OR REPLACE FUNCTION sync_listing_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Couvre INSERT et UPDATE (y compris UPDATE partiel sur latitude ou longitude seul)
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger BEFORE INSERT OR UPDATE OF latitude, longitude
--    Déclenché uniquement quand au moins l'une des deux colonnes change (optimisation).
DROP TRIGGER IF EXISTS listing_location_sync ON "Listing";
CREATE TRIGGER listing_location_sync
  BEFORE INSERT OR UPDATE OF latitude, longitude ON "Listing"
  FOR EACH ROW
  EXECUTE FUNCTION sync_listing_location();

-- 6. Index spatial GIST (utilisé par ST_DWithin, ST_Distance, etc.)
CREATE INDEX IF NOT EXISTS listing_location_gist
  ON "Listing" USING GIST (location);

-- ── Test de cohérence à exécuter après migration ───────────────────────────────
-- Vérifier que toutes les lignes ont une géométrie synchronisée :
--   SELECT id, latitude, longitude,
--          ST_Y(location::geometry) AS geom_lat,
--          ST_X(location::geometry) AS geom_lng
--   FROM "Listing"
--   WHERE ABS(ST_Y(location::geometry) - latitude) > 0.000001
--      OR ABS(ST_X(location::geometry) - longitude) > 0.000001;
-- → doit retourner 0 ligne.
