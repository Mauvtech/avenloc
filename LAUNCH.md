# Guide de lancement local — Aven MVP

## Prérequis

- Node.js 20+, pnpm 9+
- Docker + Docker Compose
- Compte Stripe (mode test) : https://dashboard.stripe.com
- (Optionnel) Projet Google Cloud pour OAuth

---

## 1. Variables d'environnement

```bash
cp apps/api/.env.example apps/api/.env
```

Renseigne dans `apps/api/.env` :

```env
# Base de données (Docker Compose — laisser tel quel)
DATABASE_URL="postgresql://aven_user:aven_password@localhost:5432/aven_db?schema=public"

# Redis (Docker Compose — laisser tel quel)
REDIS_URL="redis://localhost:6379"

# JWT — change ces valeurs en prod, n'importe quoi de long fonctionne en dev
JWT_ACCESS_SECRET="dev-access-secret-change-me-please-64chars"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="dev-refresh-secret-change-me-please-64chars"
JWT_REFRESH_EXPIRES_IN="30d"

# Google OAuth (optionnel pour tester le parcours email)
# Obtenir sur : https://console.cloud.google.com → APIs & Services → Credentials
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_CALLBACK_URL="http://localhost:3001/api/v1/auth/google/callback"

# Stripe — récupérer sur https://dashboard.stripe.com/test/apikeys
# ⚠️ Activer aussi Stripe Connect en mode test : https://dashboard.stripe.com/test/connect/overview
#    (obligatoire pour l'onboarding hôte — comptes Express — sinon POST /payments/connect/onboard échoue)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."   # voir étape 5 ci-dessous
STRIPE_PLATFORM_ACCOUNT_ID=""       # ton account ID Stripe (ac_...)

# S3 — pour le MVP, les uploads photos sont optionnels.
# Sans S3, commenter les endpoints d'upload ou utiliser un bucket MinIO local.
S3_ENDPOINT="https://s3.amazonaws.com"
S3_REGION="eu-west-3"
S3_BUCKET="aven-media"
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""

NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
```

Crée aussi `apps/web/.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 2. Démarrer l'infrastructure (PostgreSQL + Redis)

```bash
# Depuis la racine du projet
docker compose up -d postgres redis
```

Vérifier que PostgreSQL est prêt :
```bash
docker compose logs postgres | tail -5
# Doit afficher : "database system is ready to accept connections"
```

---

## 3. Installer les dépendances

```bash
pnpm install
```

---

## 4. Migrations base de données

```bash
cd apps/api

# Étape 4a — Extensions PostgreSQL (à faire une seule fois)
# Si tu as accès psql directement :
psql postgresql://aven_user:aven_password@localhost:5432/aven_db \
  -f prisma/migrations/manual/0001_extensions.sql

# Ou via Docker :
docker exec -i aven_postgres psql -U aven_user -d aven_db \
  < prisma/migrations/manual/0001_extensions.sql

# Étape 4b — Migrations Prisma (crée les tables)
pnpm db:generate
pnpm db:migrate    # Répondre "y" au nom de migration → "init"

# Étape 4c — Colonnes PostGIS + contraintes
docker exec -i aven_postgres psql -U aven_user -d aven_db \
  < prisma/migrations/manual/0002_postgis_geometry.sql

docker exec -i aven_postgres psql -U aven_user -d aven_db \
  < prisma/migrations/manual/0003_booking_constraints.sql

docker exec -i aven_postgres psql -U aven_user -d aven_db \
  < prisma/migrations/manual/0004_instant_book.sql

# Étape 4d — Données de test
pnpm db:seed
```

Les comptes de test créés :
| Email | Mot de passe | Rôles |
|-------|-------------|-------|
| `host@aven.dev` | `Password123!` | HOST + TENANT |
| `tenant@aven.dev` | `Password123!` | TENANT |

---

## 5. Stripe webhook en local (optionnel mais recommandé)

```bash
# Installer Stripe CLI : https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3001/api/v1/payments/webhook
# Copie le "webhook signing secret" affiché (whsec_...) dans .env → STRIPE_WEBHOOK_SECRET
```

## 6. Paiements — Stripe Connect (obligatoire, aucune simulation)

### Prérequis (une fois, ~3 min)

1. Créer un compte Stripe : https://dashboard.stripe.com/register — le **mode test
   est actif par défaut** (pas de bascule à faire).
2. Copier la **clé secrète test** : https://dashboard.stripe.com/test/apikeys →
   « Secret key » (`sk_test_51…`) → dans `apps/api/.env` → `STRIPE_SECRET_KEY`.
3. Activer **Connect** : https://dashboard.stripe.com/test/connect/accounts/overview
   → « Get started » → profil plateforme « Marketplace ».
4. Webhook local (recommandé) : `stripe listen --forward-to
   localhost:3001/api/v1/payments/webhook` → `whsec_…` dans `STRIPE_WEBHOOK_SECRET`.
5. **Redémarrer l'API** (le `.env` n'est lu qu'au démarrage).

Sans clé valide, `POST /payments/connect/onboard` et `POST /payments/intent`
renvoient **503** avec le message de configuration.

### Parcours hôte

1. Hôte → page **« Mes annonces »** (`/host`) → **« Configurer mes versements »**
   → onboarding Stripe hébergé (identité + IBAN chez Stripe). IBAN test :
   `FR1420041010050500013M02606`.
2. Retour sur `/host/connect/return` → « Versements activés · IBAN •••• 2606 ».
3. Tant que ce n'est pas fait, le paiement locataire renvoie
   « L'hôte n'a pas encore configuré ses informations de versement ».

### Parcours locataire

`/bookings/{id}` → **« Payer »** → carte test `4242 4242 4242 4242`, exp `12/34`,
CVC `123` → réservation confirmée, fonds transférés (moins la commission) vers
le compte Connect de l'hôte.

---

## 7. Lancer l'application

Dans deux terminaux séparés :

```bash
# Terminal 1 — Backend NestJS
cd apps/api && pnpm dev
# → http://localhost:3001/api/v1

# Terminal 2 — Frontend Next.js
cd apps/web && pnpm dev
# → http://localhost:3000
```

---

## 7. Parcours de test recommandé

### Parcours locataire
1. `http://localhost:3000/auth/register` → créer un compte
2. `http://localhost:3000` → rechercher "Paris" → cliquer sur une annonce
3. Sélectionner des dates → "Réserver"
4. `http://localhost:3000/bookings/{id}` → "Payer" (carte test Stripe : `4242 4242 4242 4242`, exp: 12/34, CVC: 123)
5. Après réservation COMPLETED : déposer un avis

### Parcours hôte
1. Se connecter avec `host@aven.dev` / `Password123!`
2. `http://localhost:3000/listings/new` → créer une annonce
3. Pour les annonces sans Instant Book : aller dans les réservations → approuver

### Tester l'Instant Book vs validation hôte
- Annonce seed "Bel appartement dans le Marais" → `instantBookEnabled: true` → confirmation automatique
- Annonce seed "Salle de réunion" → `instantBookEnabled: false` → validation hôte requise

---

## 8. Tests automatisés

```bash
cd apps/api

# Tests unitaires (tous les modules)
pnpm test

# Tests unitaires avec coverage
pnpm test:cov

# Tests e2e auth (nécessite Redis local)
pnpm test:e2e
```

---

## 9. Elasticsearch (optionnel — V2)

```bash
# Démarrer Elasticsearch (profil Docker Compose optionnel)
docker compose --profile search up -d elasticsearch

# Puis définir dans .env :
ELASTICSEARCH_URL=http://localhost:9200
```

Tant que `ELASTICSEARCH_URL` est vide, le backend utilise PostGIS pour la recherche.

---

## Commandes utiles

```bash
# Voir les logs API en temps réel
cd apps/api && pnpm dev

# Prisma Studio (explorer la DB graphiquement)
cd apps/api && pnpm db:studio

# Relancer le seed
cd apps/api && pnpm db:seed

# Vérifier la synchro PostGIS (doit retourner 0 ligne)
docker exec aven_postgres psql -U aven_user -d aven_db -c "
  SELECT id FROM \"Listing\"
  WHERE ABS(ST_Y(location::geometry) - latitude) > 0.000001
     OR ABS(ST_X(location::geometry) - longitude) > 0.000001;
"
```
