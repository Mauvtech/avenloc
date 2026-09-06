-- Migration manuelle 0001 : activation des extensions PostgreSQL
-- À exécuter AVANT la première migration Prisma (prisma migrate dev).
-- Ces extensions ne peuvent pas être créées par Prisma dans tous les environnements
-- (ex : RDS nécessite des droits superuser séparés).

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- requis pour EXCLUDE USING gist sur uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- requis pour gen_random_uuid()
