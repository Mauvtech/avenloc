-- Retired development-only migration. The old version TRUNCATED booking data.
-- Never execute it in production. scripts/release.sh uses the atomic,
-- data-preserving 0006_hourly_slots_upgrade.sql + post.sql replacement.
DO $$ BEGIN
  RAISE EXCEPTION 'Retired migration: run scripts/release.sh for the non-destructive hourly upgrade';
END $$;
