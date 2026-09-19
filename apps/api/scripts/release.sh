#!/bin/sh
# Démarrage de l'API en production.
#   - initialise le schéma la première fois (base vierge) : extensions + db push
#     + migrations SQL manuelles (PostGIS, contraintes) + seed de démo ;
#   - sinon rattrape toute migration SQL additionnelle non encore appliquée
#     (voir la table `_SqlMigrations`) ;
#   - démarre le serveur seulement après le succès des migrations.
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

# Attend que la base accepte les connexions (jusqu'à ~60 s) avant d'agir.
i=0
until psql "$PSQL_URL" -c 'SELECT 1' >/dev/null 2>&1; do
  i=$((i + 1))
  if [ "$i" -ge 30 ]; then
    echo "✗ Base injoignable après 60 s" >&2
    exit 1
  fi
  echo "… attente de la base ($i)"
  sleep 2
done

# Dossier d'uploads (volume persistant en prod).
[ -n "$UPLOADS_DIR" ] && mkdir -p "$UPLOADS_DIR" 2>/dev/null || true

# Registre des migrations SQL déjà appliquées — permet d'ajouter de nouveaux
# fichiers prisma/sql/000N_*.sql au fil du temps et de les faire rattraper
# automatiquement sur une base déjà initialisée, sans rejouer les anciens
# (certains ne sont pas idempotents : ADD CONSTRAINT sans IF NOT EXISTS).
# ⚠️ Ne JAMAIS créer cette table avant `prisma db push` : comme la colonne
# géométrique PostGIS, une table absente de schema.prisma serait supprimée par
# `--accept-data-loss` (db push resynchronise la base pour matcher le schéma).
CREATE_LEDGER='CREATE TABLE IF NOT EXISTS "_SqlMigrations" (filename TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now());'

INITIALIZED=$(psql "$PSQL_URL" -tAc \
  "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='User' LIMIT 1;" \
  2>/dev/null || true)

if [ "$INITIALIZED" != "1" ]; then
  log "Base vierge détectée — initialisation du schéma"
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f prisma/sql/0001_extensions.sql
  log "prisma db push"
  "$PRISMA" db push --skip-generate
  log "Migrations SQL manuelles (PostGIS + contraintes)"
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f prisma/sql/0002_postgis_geometry.sql
  # 0003 cible les anciennes colonnes DATE ; ses contraintes sont remplacées
  # par le groupe 0006, exécuté plus bas sur le schéma courant.
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -f prisma/sql/0004_instant_book.sql
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -c "$CREATE_LEDGER" >/dev/null
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -c \
    "INSERT INTO \"_SqlMigrations\"(filename) VALUES
      ('0001_extensions.sql'), ('0002_postgis_geometry.sql'),
      ('0003_booking_constraints.sql'), ('0004_instant_book.sql')
     ON CONFLICT DO NOTHING;" >/dev/null
  log "Schéma initialisé ✓"
else
  log "Base déjà initialisée"
  psql "$PSQL_URL" -v ON_ERROR_STOP=1 -c "$CREATE_LEDGER" >/dev/null
  # Base initialisée par une version antérieure à l'introduction du registre :
  # 0001-0004 ont forcément déjà été appliqués (ils datent de la mise en place
  # initiale du schéma) → on les marque faits sans les rejouer.
  LEDGER_EMPTY=$(psql "$PSQL_URL" -tAc 'SELECT count(*) = 0 FROM "_SqlMigrations";')
  if [ "$LEDGER_EMPTY" = "t" ]; then
    psql "$PSQL_URL" -v ON_ERROR_STOP=1 -c \
      "INSERT INTO \"_SqlMigrations\"(filename) VALUES
        ('0001_extensions.sql'), ('0002_postgis_geometry.sql'),
        ('0003_booking_constraints.sql'), ('0004_instant_book.sql')
       ON CONFLICT DO NOTHING;" >/dev/null
  fi
fi

# Les anciens scripts pre/post ne sont jamais parcourus directement : pre était
# destructif, et l'ordre alphabétique plaçait post avant pre. Leur remplacement
# convertit les colonnes puis restaure les contraintes dans UNE transaction.
for f in prisma/sql/*.sql; do
  name=$(basename "$f")
  case "$name" in
    0006_hourly_slots_pre.sql|0006_hourly_slots_post.sql) continue ;;
  esac
  case "$name" in
    *[!a-zA-Z0-9_.-]*) echo "Nom de migration invalide" >&2; exit 1 ;;
  esac
  log "Vérification migration : $name"
  if [ "$name" = "0006_hourly_slots_upgrade.sql" ]; then
    psql "$PSQL_URL" -X --single-transaction -v ON_ERROR_STOP=1 <<SQL
SELECT pg_advisory_xact_lock(20260919, 6);
SELECT NOT EXISTS (SELECT 1 FROM "_SqlMigrations" WHERE filename = '$name') AS apply_migration \gset
\if :apply_migration
\i prisma/sql/0006_hourly_slots_upgrade.sql
\i prisma/sql/0006_hourly_slots_post.sql
INSERT INTO "_SqlMigrations" (filename) VALUES
  ('0006_hourly_slots_upgrade.sql'), ('0006_hourly_slots_pre.sql'), ('0006_hourly_slots_post.sql')
ON CONFLICT DO NOTHING;
\endif
SQL
  else
    # La migration et son entrée de registre sont atomiques. Le verrou empêche
    # deux conteneurs de rejouer simultanément une même migration au redéploiement.
    psql "$PSQL_URL" -X --single-transaction -v ON_ERROR_STOP=1 <<SQL
SELECT pg_advisory_xact_lock(20260919, 6);
SELECT NOT EXISTS (SELECT 1 FROM "_SqlMigrations" WHERE filename = '$name') AS apply_migration \gset
\if :apply_migration
\i $f
INSERT INTO "_SqlMigrations" (filename) VALUES ('$name');
\endif
SQL
  fi
done

# Une ancienne base n'est jamais réensemencée. Sur une base neuve, attendre que
# toutes les contraintes et tous les champs attendus par le seed soient prêts.
if [ "$INITIALIZED" != "1" ] && [ "${SEED_ON_INIT:-true}" = "true" ]; then
  log "Seed de démonstration"
  node prisma/dist/seed.js || echo "⚠ seed échoué (non bloquant)"
fi

log "Démarrage du serveur NestJS"
exec node dist/src/main.js
