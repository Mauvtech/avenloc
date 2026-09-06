#!/bin/sh
# Démarrage de l'API en production.
#   - initialise le schéma la première fois (base vierge) : extensions + db push
#     + migrations SQL manuelles (PostGIS, contraintes) + seed de démo ;
#   - sinon démarre directement.
# Idempotent : sûr à relancer à chaque déploiement.
set -e
cd "$(dirname "$0")/.."   # -> apps/api

log() { echo "▶ $*"; }
PRISMA="./node_modules/.bin/prisma"

if [ -z "$DATABASE_URL" ]; then
  echo "✗ DATABASE_URL manquant" >&2
  exit 1
fi

# libpq (psql) n'accepte pas les paramètres Prisma type ?schema=public → on les retire.
# Prisma (db push, seed) continue d'utiliser $DATABASE_URL tel quel.
PSQL_URL=$(printf '%s' "$DATABASE_URL" | sed 's/[?].*//')

# Dossier d'uploads (volume persistant en prod).
[ -n "$UPLOADS_DIR" ] && mkdir -p "$UPLOADS_DIR" 2>/dev/null || true

INITIALIZED=$(psql "$PSQL_URL" -tAc \
  "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='User' LIMIT 1;" \
  2>/dev/null || true)

if [ "$INITIALIZED" = "1" ]; then
  log "Base déjà initialisée — pas de migration de schéma"
else
  log "Base vierge détectée — initialisation du schéma"
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f prisma/sql/0001_extensions.sql
  log "prisma db push"
  "$PRISMA" db push --skip-generate --accept-data-loss
  log "Migrations SQL manuelles (PostGIS + contraintes)"
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f prisma/sql/0002_postgis_geometry.sql
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f prisma/sql/0003_booking_constraints.sql
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f prisma/sql/0004_instant_book.sql
  if [ "${SEED_ON_INIT:-true}" = "true" ]; then
    log "Seed de démonstration"
    node prisma/dist/seed.js || echo "⚠ seed échoué (non bloquant)"
  fi
  log "Schéma initialisé ✓"
fi

log "Démarrage du serveur NestJS"
exec node dist/src/main.js
