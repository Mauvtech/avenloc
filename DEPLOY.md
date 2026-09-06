# Déploiement Aven — démo publique sur Railway

Cible : une URL publique pour dérouler tous les parcours. Stripe reste en mode
test (feature flag `simulatePayments` actif → aucun paiement réel, aucun onboarding
Stripe requis). 4 services sur un même projet Railway :

| Service   | Source                    | Rôle                               |
|-----------|---------------------------|------------------------------------|
| `postgis` | template PostGIS (Railway)| PostgreSQL 16 + PostGIS            |
| `redis`   | plugin Redis (Railway)    | tokens de session / reset password |
| `api`     | ce repo, `apps/api/Dockerfile` | NestJS — `https://…/api/v1`   |
| `web`     | ce repo, `apps/web/Dockerfile` | Next.js — l'URL publique      |

Tout est déjà en place dans le repo : `Dockerfile` (API + web), `railway.json`
par service, `apps/api/scripts/release.sh` (init schéma + migrations SQL PostGIS +
seed au premier boot, idempotent ensuite). Images testées en local de bout en bout.

---

## 0. Prérequis

- Un compte Railway (https://railway.com) — plan Hobby (~5 $/mois d'usage inclus).
- Le repo GitHub `Mauvtech/avenloc` (déjà poussé).

---

## 1. Créer le projet + la base

1. Railway → **New Project** → **Deploy PostgreSQL**… puis en fait :
   **New Project → Empty Project**, nomme-le `aven`.
2. Dans le projet : **+ New → Database → Add PostGIS**
   (barre de recherche : taper « PostGIS » — c'est le template `postgis/postgis`.
   ⚠️ *ne pas* prendre « PostgreSQL » simple, il n'a pas l'extension PostGIS).
   Le service apparaît (nom par défaut `Postgres` ou `PostGIS`).
3. **+ New → Database → Add Redis**.

> Repère le **nom exact** des deux services (ex. `Postgres`, `Redis`) : il sert
> dans les références de variables ci-dessous.

---

## 2. Service API

1. **+ New → GitHub Repo → `Mauvtech/avenloc`**. Railway crée un service.
2. Renomme-le **`api`** (Settings → Service Name).
3. **Settings → Config-as-code** → *Railway Config File* = `apps/api/railway.json`.
   (Il fixe le Dockerfile, le healthcheck `/api/v1/health`, la politique de restart.)
4. **Settings → Build** : laisse *Root Directory* **vide** (le build a besoin de la
   racine du repo comme contexte). Le Dockerfile vient du `railway.json`.
5. **Variables** → *Raw editor* → colle ceci (adapte les noms de services si besoin) :

   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   NODE_ENV=production
   JWT_ACCESS_SECRET=REMPLACER_openssl_rand_hex_32
   JWT_REFRESH_SECRET=REMPLACER_openssl_rand_hex_32
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=30d
   FEATURES=simulatePayments
   FEATURES_ADMIN=true
   SEED_ON_INIT=true
   UPLOADS_DIR=/data/uploads
   ```

   Génère chaque secret avec `openssl rand -hex 32` en local.

6. **Settings → Networking → Generate Domain** (port 3001 si demandé).
   Note l'URL, ex. `https://api-production-xxxx.up.railway.app`.
7. Ajoute deux variables qui dépendent de cette URL :

   ```
   API_PUBLIC_URL=https://api-production-xxxx.up.railway.app
   FRONTEND_URL=https://TEMPORAIRE   (corrigé à l'étape 4)
   ```

8. **Volume** (pour que les photos uploadées survivent aux redéploiements) :
   Service `api` → **+ Volume** → Mount path `/data`.
9. Le service se déploie. Suis **Deployments → View Logs** : tu dois voir
   `Base vierge détectée → prisma db push → Migrations SQL manuelles → Seed →
   Nest application successfully started`, puis le healthcheck passe au vert.

---

## 3. Service web

1. **+ New → GitHub Repo → `Mauvtech/avenloc`** (le même repo, 2ᵉ service).
2. Renomme-le **`web`**.
3. **Settings → Config-as-code** → `apps/web/railway.json`.
4. *Root Directory* **vide** également.
5. **Variables** :

   ```
   NEXT_PUBLIC_API_URL=https://api-production-xxxx.up.railway.app/api/v1
   ```

   (⚠️ suffixe `/api/v1`. Cette variable est lue au **build** — Railway la passe
   en build-arg automatiquement. La changer = re-déployer le service web.)
6. **Settings → Networking → Generate Domain** (port 3000).
   Note l'URL, ex. `https://web-production-yyyy.up.railway.app`.

---

## 4. Reboucler le CORS

1. Retour sur le service **`api` → Variables** :
   `FRONTEND_URL=https://web-production-yyyy.up.railway.app`
2. Le service `api` redéploie tout seul. La base est déjà initialisée →
   log `Base déjà initialisée`, démarrage direct.

---

## 5. Vérifier

```bash
curl https://api-production-xxxx.up.railway.app/api/v1/health
# → {"status":"ok","db":"up",...}
```

Puis ouvre l'URL du service `web` :

- page d'accueil = annonces de démo **avec photos** ;
- connexion : `host@aven.dev` / `Password123!` (hôte) ou `tenant@aven.dev` /
  `Password123!` (locataire) ;
- parcours locataire : chercher une ville → réserver → « Payer » (simulé,
  aucune carte demandée) → réservation confirmée → la conversation s'ouvre ;
- barre **⚙︎ Démo** en bas à gauche : bascule les feature flags (dont
  `simulatePayments`) pour tester les variantes de parcours.

---

## Après le premier déploiement

- **Redéploiements** : `git push` sur `main` → Railway rebuild et redéploie les
  services `api` et `web`. `release.sh` ne retouche pas la base (détection de
  schéma existant).
- **Repartir d'une base propre** : supprime le service PostGIS, recrée-le,
  garde `SEED_ON_INIT=true` → le prochain boot de `api` réinitialise + reseed.
- **Couper le seed** : `SEED_ON_INIT=false` une fois la démo peuplée.
- **Uploads** : stockés sur le volume `/data`. Sans volume, ils disparaissent à
  chaque redeploy (les photos du seed, elles, sont des URLs Unsplash → toujours OK).

---

## Activer Stripe test (optionnel, si tu veux montrer le vrai onboarding)

1. Service `api` → Variables :
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   FEATURES=            (vider pour désactiver la simulation)
   ```
2. Service `web` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` (rebuild).
3. Dashboard Stripe test → webhook vers
   `https://api-production-xxxx.up.railway.app/api/v1/payments/webhook`.
4. Profil plateforme Connect à compléter côté Stripe (cf. `LAUNCH.md` §6).
   IBAN de test : `FR1420041010050500013M02606`, carte `4242 4242 4242 4242`.

---

## Activer Google OAuth (optionnel)

Sans `GOOGLE_CLIENT_ID`, la stratégie n'est pas montée (démarrage OK) et le bouton
« Continuer avec Google » renvoie une erreur. Pour l'activer : créer un client
OAuth (console Google Cloud), URL de redirection
`https://api-production-xxxx.up.railway.app/api/v1/auth/google/callback`, puis
renseigner `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL`
sur le service `api`.
