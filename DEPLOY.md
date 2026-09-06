# Mettre Aven en ligne sur Railway

Suivre les étapes **dans l'ordre, sans en sauter**. Chaque étape = une seule action.
À la fin : une URL publique avec des données de démo. Aucun paiement réel (Stripe simulé).

On va créer **4 briques** dans un même projet Railway :

1. une base **PostGIS**
2. un **Redis**
3. le service **api** (le backend)
4. le service **web** (le site)

Tout le code nécessaire est déjà dans le repo. Toi tu fais seulement les clics sur Railway.

---

## Étape 1 — Créer le projet

1. Va sur https://railway.com → connecte-toi avec GitHub.
2. Bouton **New Project**.
3. Choisis **Empty Project**.
4. En haut à gauche, renomme le projet `aven` (clic sur le nom).

Tu as maintenant un canvas vide.

---

## Étape 2 — Ajouter la base PostGIS

1. Clic sur **+ New** (ou **+ Create**).
2. Choisis **Database**.
3. Dans la liste, cherche **PostGIS** et clique dessus.
   ⚠️ **Pas** « PostgreSQL » tout court — il manque l'extension géo, l'API ne démarrera pas.
4. Un bloc apparaît sur le canvas. Clique dessus, onglet **Settings**, note son **nom exact**
   (souvent `PostGIS` ou `Postgres`). Tu en auras besoin à l'étape 5.

---

## Étape 3 — Ajouter Redis

1. Clic sur **+ New**.
2. **Database** → **Redis**.
3. Note aussi son nom exact (souvent `Redis`).

---

## Étape 4 — Créer le service « api »

1. Clic sur **+ New** → **GitHub Repo**.
2. Autorise Railway sur le repo si demandé, puis choisis **`Mauvtech/avenloc`**.
3. Un nouveau bloc apparaît. Clique dessus → onglet **Settings**.
4. **Service Name** : mets `api`.
5. Descends jusqu'à **Config-as-code** (ou *Railway Config File*).
   Mets exactement : `apps/api/railway.json`
6. Juste en dessous, section **Source / Build** : le champ **Root Directory** doit rester **VIDE**.
   (Si Railway a mis `/`, efface-le. Le build a besoin de tout le repo.)
7. Ne touche à rien d'autre ici. Le déploiement va sûrement échouer une première fois :
   c'est normal, il manque les variables. On les ajoute à l'étape suivante.

---

## Étape 5 — Les variables du service « api »

1. Toujours sur le service `api`, onglet **Variables**.
2. Clique **Raw Editor** (ou « éditeur brut »).
3. Colle ce bloc tel quel :

   ```
   DATABASE_URL=${{PostGIS.DATABASE_URL}}
   REDIS_URL=${{Redis.REDIS_URL}}
   NODE_ENV=production
   JWT_ACCESS_SECRET=à_remplacer_1
   JWT_REFRESH_SECRET=à_remplacer_2
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=30d
   FEATURES=simulatePayments
   FEATURES_ADMIN=true
   SEED_ON_INIT=true
   UPLOADS_DIR=/data/uploads
   ```

4. **Si ton service base ne s'appelle pas `PostGIS`** (étape 2) : remplace `PostGIS`
   dans `${{PostGIS.DATABASE_URL}}` par son vrai nom. Pareil pour `Redis`.
5. Remplace `à_remplacer_1` et `à_remplacer_2` par deux chaînes aléatoires.
   Dans un terminal : `openssl rand -hex 32` (une fois pour chaque).
6. Valide (**Update Variables**). Le service `api` redéploie automatiquement.

---

## Étape 6 — Donner une URL au service « api »

1. Service `api` → **Settings** → section **Networking**.
2. Clique **Generate Domain**. Si on te demande un port : `3001`.
3. Copie l'URL générée, par exemple :
   `https://api-production-1a2b.up.railway.app`
4. Retourne dans **Variables** → **Raw Editor**, ajoute ces 2 lignes
   (avec TON URL, garde `FRONTEND_URL` en faux pour l'instant) :

   ```
   API_PUBLIC_URL=https://api-production-1a2b.up.railway.app
   FRONTEND_URL=https://à-corriger.example.com
   ```

5. Valide. Nouveau redeploy.

---

## Étape 7 — Un disque pour les photos uploadées

1. Service `api` → **+ Volume** (bouton dans le service, ou clic droit sur le bloc → *Add Volume*).
2. **Mount path** : `/data`
3. Valide.

---

## Étape 8 — Vérifier que l'api tourne

1. Service `api` → onglet **Deployments** → clique le dernier → **View Logs**.
2. Tu dois voir défiler, dans l'ordre :

   ```
   Base vierge détectée — initialisation du schéma
   prisma db push
   Migrations SQL manuelles (PostGIS + contraintes)
   Seed de démonstration
   Nest application successfully started
   ```

3. Dans un terminal :
   `curl https://api-production-1a2b.up.railway.app/api/v1/health`
   → doit répondre `{"status":"ok","db":"up",...}`

Si ça bloque ici, ne continue pas — colle-moi les logs.

---

## Étape 9 — Créer le service « web »

1. Clic **+ New** → **GitHub Repo** → **le même repo** `Mauvtech/avenloc`.
   (Oui, deux services sur le même repo, c'est voulu.)
2. Nouveau bloc → **Settings**.
3. **Service Name** : `web`
4. **Config-as-code** : `apps/web/railway.json`
5. **Root Directory** : **VIDE** (comme pour l'api).

---

## Étape 10 — La variable du service « web »

1. Service `web` → **Variables** → **Raw Editor**.
2. Colle (avec l'URL de TON api, étape 6, **et le `/api/v1` à la fin**) :

   ```
   NEXT_PUBLIC_API_URL=https://api-production-1a2b.up.railway.app/api/v1
   ```

3. Valide. Le service `web` build (2-3 min).

> Cette variable est lue **pendant le build**. Si tu la changes plus tard, il faut
> redéployer le service `web` (bouton **Deploy** / **Redeploy**).

---

## Étape 11 — Donner une URL au service « web »

1. Service `web` → **Settings** → **Networking** → **Generate Domain**. Port : `3000`.
2. Copie l'URL, par exemple :
   `https://web-production-9x8y.up.railway.app`

---

## Étape 12 — Corriger le `FRONTEND_URL` de l'api

1. Reviens sur le service **`api`** → **Variables** → **Raw Editor**.
2. Remplace la ligne `FRONTEND_URL=...` par l'URL du `web` (étape 11) :

   ```
   FRONTEND_URL=https://web-production-9x8y.up.railway.app
   ```

3. Valide. L'`api` redéploie (cette fois il verra que la base est déjà prête et
   démarrera directement : log `Base déjà initialisée`).

---

## Étape 13 — C'est en ligne

Ouvre l'URL du service `web`.

- La page d'accueil montre les annonces de démo **avec photos**.
- Connexion (bouton **Se connecter**) :
  - hôte : `host@aven.dev` / `Password123!`
  - locataire : `tenant@aven.dev` / `Password123!`
- Parcours locataire : chercher une ville → ouvrir une annonce → choisir des dates →
  **Réserver** → **Payer** (simulé, aucune carte) → réservation confirmée → la
  conversation s'ouvre toute seule.
- En bas à gauche, la barre **⚙︎ Démo** permet de couper/activer `simulatePayments`
  et les autres options pour tester toutes les variantes.

---

## Après coup

- **Mettre à jour le site** : `git push` sur `main` → Railway rebuild `api` et `web`
  tout seul. La base n'est pas retouchée.
- **Repartir d'une base vide** : supprime le service PostGIS, refais les étapes 2 et 5
  (le nom peut changer → revérifie `${{...}}`). Au prochain boot, `api` réinitialise
  et re-seed (car `SEED_ON_INIT=true`).
- **Arrêter de re-seeder** : passe `SEED_ON_INIT=false` sur `api`.

---

## Option — activer le vrai Stripe (test) plus tard

Pas nécessaire pour la démo. Si tu veux montrer le vrai onboarding hôte :

1. Service `api` → Variables :
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   FEATURES=
   ```
   (`FEATURES=` vide → on sort du mode simulation.)
2. Service `web` → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...` puis redeploy `web`.
3. Dashboard Stripe (mode test) → webhooks → endpoint :
   `https://api-production-1a2b.up.railway.app/api/v1/payments/webhook`
4. Compléter le profil plateforme Connect côté Stripe (voir `LAUNCH.md` §6).
   Carte de test : `4242 4242 4242 4242`. IBAN de test : `FR1420041010050500013M02606`.

## Option — activer le bouton « Continuer avec Google »

Sans configuration, le site démarre très bien mais ce bouton renvoie une erreur.
Pour l'activer : créer un identifiant OAuth dans Google Cloud Console, URL de
redirection `https://api-production-1a2b.up.railway.app/api/v1/auth/google/callback`,
puis sur le service `api` :

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://api-production-1a2b.up.railway.app/api/v1/auth/google/callback
```
