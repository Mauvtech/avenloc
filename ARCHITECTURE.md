# Architecture technique — Aven

> Document vivant. Chaque décision structurante est consignée ici avec son contexte et ses raisons, pour qu'un futur développeur comprenne le *pourquoi* et ne "corrige" pas involontairement un choix délibéré.

---

## 1. Vue d'ensemble

Aven est un monolithe modulaire NestJS. Les modules sont séparés par domaine métier (DDD léger) pour que la frontière future vers des microservices soit naturelle, sans sur-ingénierie dès le départ.

```
apps/
  api/     NestJS — modules: auth, users, listings, search, bookings, payments, messaging, reviews
  web/     Next.js App Router
packages/
  shared-types/   Types TypeScript partagés (DTOs, enums)
```

---

## 2. Modèle de données

### 2.1 Locaux hétérogènes — champ `specificAttributes` (JSONB)

**Décision :** Un seul modèle `Listing` avec un champ `specificAttributes Json?` absorbe les attributs propres à chaque type de local.

**Pourquoi pas une table par type ?** Les types de locaux partagent 90% de leur structure (adresse, prix, disponibilités, photos, réservations). Des tables séparées (ex. `Apartment`, `ParkingSpot`) impliqueraient de dupliquer toutes les relations et compliqueraient la recherche multi-type.

**Pourquoi pas un seul modèle plat avec tous les champs ?** Des dizaines de colonnes nullable selon le type rendraient le schéma illisible et les contraintes d'intégrité impossibles à exprimer.

**Compromis JSONB :** Les attributs communs (prix, capacité humaine, localisation) restent des colonnes typées et indexables. Les attributs spécifiques au type vivent en JSONB — flexibles, sans migration si un nouveau champ est ajouté à un type. La validation de la structure du JSON est assurée au niveau service (zod), pas en base.

**Exemples de valeurs par type :**
| Type | specificAttributes |
|------|--------------------|
| `APARTMENT` | `{ "floor": 3, "elevator": true, "balcony": false }` |
| `MEETING_ROOM` | `{ "projector": true, "whiteboard": true, "capacity_persons": 12 }` |
| `WAREHOUSE` | `{ "surface_m2": 500, "height_m": 6.5, "loading_dock": true }` |
| `PARKING` | `{ "spots": 2, "covered": true, "ev_charger": false }` |

**Migration V2 :** Si un type particulier devient suffisamment complexe, on peut créer une table satellite (`ListingWarehouseDetail`) liée par FK sans toucher au schéma commun.

---

### 2.2 `maxGuests` vs `specificAttributes` pour la capacité

**Décision :** `maxGuests Int?` est un champ de première classe sur `Listing`, uniquement pour les types habitables (APARTMENT, HOUSE, ROOM). Toute autre mesure de capacité (m², places, hauteur) va dans `specificAttributes`.

**Pourquoi :** `maxGuests` est un critère de filtre de recherche fréquent (`WHERE "maxGuests" >= $guestCount`). Le stocker comme colonne permet un index B-tree standard. Si c'était dans le JSONB, le filtre nécessiterait un index GIN partiel et une extraction JSON, moins performant et plus fragile.

---

### 2.3 Anti-double-booking

**Décision :** Triple couche de protection.

1. **Validation applicative** (service `bookings`) : vérification des disponibilités avant INSERT.
2. **`SELECT ... FOR UPDATE`** sur le `Listing` au sein d'une transaction : sérialise les tentatives concurrentes sur le même local.
3. **`EXCLUDE USING gist`** en base (migration `0003`) : filet de sécurité absolu — même un bug applicatif ne peut pas créer un double-booking confirmé.

```sql
EXCLUDE USING gist (
  "listingId" WITH =,
  daterange("startDate"::date, "endDate"::date, '[)') WITH &&
)
WHERE (status IN ('PENDING', 'CONFIRMED'))
```

**Pourquoi la contrainte est partielle (`WHERE`) :** Les réservations `CANCELLED` et `COMPLETED` ne bloquent plus le calendrier. Sans le `WHERE`, annuler une réservation et en créer une nouvelle pour les mêmes dates serait impossible.

**Erreur PostgreSQL attendue :** `23P01 exclusion_violation` → interceptée dans le service et retournée en `409 Conflict`.

**Requires :** extension `btree_gist` (migration `0001`) pour combiner l'opérateur `=` sur `uuid` et `&&` sur `daterange` dans la même contrainte GIST.

---

### 2.4 Convention `endDate` exclusif

**Décision :** La plage de réservation est `[startDate, endDate[` — borne supérieure **exclue**.

**Exemple :** 2 nuits du 10 au 12 juillet → `startDate = 2024-07-10`, `endDate = 2024-07-12`, `unitCount = 2`.

**Pourquoi :** Cohérence avec `daterange('[)')` de PostgreSQL, standard dans les systèmes de calendrier. Évite l'ambiguité du "dernier jour inclus ou exclus ?" lors des requêtes de chevauchement.

**Contrainte CHECK :** `startDate < endDate` en base (migration `0003`) — défense en profondeur si un bug contourne la validation DTO.

---

### 2.5 `Booking.serviceFee` vs `Payment.platformFee` — coexistence intentionnelle

Ces deux champs semblent redondants. Ils ne le sont pas.

| Champ | Quand est-il calculé ? | Source |
|-------|----------------------|--------|
| `Booking.serviceFee` | Au moment de la **création de la réservation** (`PENDING`) | Logique métier (taux effectif au moment de la réservation) |
| `Payment.platformFee` | Au moment de la **capture Stripe** | Montant effectivement prélevé par Stripe Connect |

**Pourquoi les deux existent :**
- Le taux de commission peut changer entre la réservation et le paiement (par ex. si `PlatformConfig.serviceFeeRate` est modifié entre les deux).
- `Booking.serviceFee` est le montant **annoncé** au locataire et à l'hôte au moment de la réservation — il ne doit jamais changer après `CONFIRMED`.
- `Payment.platformFee` est le montant **réel** prélevé par Stripe — source de vérité pour la comptabilité.
- En cas d'écart (rare), les deux champs permettent de l'auditer sans perte d'information.

**Ne pas "corriger" ceci** en supprimant l'un des deux champs.

---

### 2.6 `PlatformConfig` — taux de commission global avec override par annonce

**Décision :** Table singleton `PlatformConfig` (une seule ligne `id = 'default'`) portant `serviceFeeRate` global. Champ optionnel `Listing.serviceFeeRateOverride` pour les cas particuliers.

**Algorithme de résolution au moment du calcul :**
```typescript
const rate = listing.serviceFeeRateOverride ?? platformConfig.serviceFeeRate;
```

**Pourquoi pas `serviceFeeRate` directement sur chaque `Listing` :** Si le taux global passe de 12% à 10%, il faudrait migrer toutes les lignes existantes (et se demander si on applique le nouveau taux aux anciennes annonces). Avec `PlatformConfig`, le changement est atomique et immédiat pour toutes les annonces sans override.

---

### 2.7 Géospatial — synchronisation `latitude`/`longitude` ↔ PostGIS

**Décision :** Double représentation avec trigger de synchronisation.

- **Colonnes Float `latitude`/`longitude`** : manipulées par Prisma ORM (lecture, écriture, migrations). Prisma ne supporte pas nativement les types `geometry` de PostGIS.
- **Colonne `location geometry(Point, 4326)`** : utilisée exclusivement pour les requêtes géospatiales (`ST_DWithin`, `ST_Distance`) et indexée en GIST.

**Trigger `listing_location_sync`** : `BEFORE INSERT OR UPDATE OF latitude, longitude` — déclenché même pour un UPDATE ne modifiant qu'une seule des deux coordonnées.

**Point de fragilité :** Si le trigger ne couvre que les INSERT, un UPDATE partiel (ex. correction de longitude seulement) laisserait la géométrie désynchronisée, faussant silencieusement la recherche.

**Test d'intégration obligatoire (voir `test/listings/geosync.spec.ts`) :**
```
1. INSERT un listing (lat=48.8566, lng=2.3522)
2. Vérifier ST_Y(location) ≈ 48.8566 et ST_X(location) ≈ 2.3522
3. UPDATE latitude seulement → 48.9000
4. Vérifier ST_Y(location) ≈ 48.9000 (le trigger a bien recalculé)
5. UPDATE longitude seulement → 2.4000
6. Vérifier ST_X(location) ≈ 2.4000
```

---

### 2.8 Avis — relation polymorphique

**Décision :** Un seul modèle `Review` avec deux FK optionnelles mutuellement exclusives.

```
target = LISTING → listingId non-null, tenantSubjectId null
target = TENANT  → tenantSubjectId non-null, listingId null
```

**Pourquoi pas deux tables séparées (`ListingReview`, `TenantReview`) :** Le code de création, modération et affichage des avis est identique. Deux tables doubleraient la logique.

**Invariant d'exclusivité mutuelle :** Garanti au niveau service (vérification avant INSERT). PostgreSQL ne supporte pas les CHECK contraints inter-colonnes avec FK, donc pas de contrainte en base — c'est documenté ici pour qu'un futur dev ne cherche pas à l'ajouter.

**Champ `subjectId` supprimé :** La version initiale déclarait un `subjectId String` non relié à aucune FK — supprimé pour éviter toute confusion avec les FK réelles `listingId` et `tenantSubjectId`.

---

### 2.9 `unitCount` — source of truth pour la facturation

**Décision :** `Booking.unitCount` est l'unique champ portant le nombre d'unités facturées (nuits, heures ou jours). Pas de champ `nights` redondant.

**Interprétation :** `unitCount` × `Listing.pricingUnit` = durée de la réservation. Le service `PricingService` est responsable de cette interprétation.

**Formule de calcul du total :**
```
baseAmount   = listing.basePrice × unitCount
cleaningFee  = listing.cleaningFee ?? 0
serviceFee   = (baseAmount + cleaningFee) × effectiveRate
taxAmount    = (baseAmount + cleaningFee + serviceFee) × platformConfig.taxRate
totalAmount  = baseAmount + cleaningFee + serviceFee + taxAmount
```

---

## 3. Abstraction SearchEngine

**Décision :** Interface `SearchEnginePort` dans `search/ports/` avec deux implémentations :
- **V1 : `PostgisSearchAdapter`** — requêtes `ST_DWithin` + filtres SQL. Suffisant pour le MVP.
- **V2 : `ElasticsearchSearchAdapter`** — branché sans modifier le service métier.

**Le module `search` ne dépend jamais d'une implémentation concrète** — uniquement du token d'injection `SEARCH_ENGINE_PORT`. Elasticsearch peut être activé via variable d'environnement (`ELASTICSEARCH_URL` non-vide).

---

## 4. Auth — JWT + Refresh tokens

**Access token :** courte durée (15 min), stateless, signé RS256 (ou HS256 en dev).
**Refresh token :** longue durée (30 jours), stocké en base (`RefreshToken.tokenHash = SHA-256(token)`). Rotation à chaque usage (refresh invalide l'ancien et émet un nouveau). Révocation possible (ex. déconnexion globale).

**Pourquoi stocker le hash et pas le token :** Si la table est compromise, les tokens bruts ne sont pas exploitables.

**OAuth Google — flow complet avec code d'échange :**

Google redirige le navigateur (pas un fetch) vers le backend, donc retourner du JSON afficherait juste du JSON à l'écran. Le flow utilise un code d'échange intermédiaire :

```
Navigateur → GET /auth/google
           → redirect Google OAuth consent
           → GET /auth/google/callback (Passport valide le profil)
           → backend génère tokens + code opaque 60s (stocké Redis)
           → redirect FRONTEND_URL/auth/callback?code=<code>

Frontend (page /auth/callback) → POST /auth/exchange { code }
                               → backend lit Redis[code], supprime (usage unique)
                               → retourne { accessToken, refreshToken }
```

**Pourquoi un code intermédiaire et pas les tokens en URL :**
- Les tokens dans l'URL sont loggés (serveurs, proxies, historique navigateur, Referer header)
- Le code est opaque (64 hex chars aléatoires), valide 60s, usage unique
- Même si le code est capturé, il ne vaut rien après la première utilisation

**Dette de sécurité documentée :** Le refresh token est actuellement retourné en JSON (corps de la réponse). Avant production, migrer vers un cookie `httpOnly; Secure; SameSite=Strict` pour éliminer la surface XSS. L'access token (15 min) peut rester en mémoire JS.

---

## 5. Stripe Connect

**Flow de paiement :**
1. Locataire crée une réservation → `Booking` en `PENDING`.
2. Frontend appelle `POST /payments/intent` → backend crée un `PaymentIntent` Stripe avec `application_fee_amount` = commission plateforme.
3. Frontend confirme le paiement (Stripe.js).
4. Webhook `payment_intent.succeeded` → backend passe `Booking` en `CONFIRMED` + `Payment` en `CAPTURED` + crée le `Transfer` vers le compte Connect de l'hôte.

**Pourquoi le Transfer est séparé du PaymentIntent :** Stripe Connect Standard/Express traite l'argent sur le compte plateforme en premier ; le transfer vers l'hôte est une opération distincte, ce qui permet de retenir les fonds en cas de litige.

**Sécurité webhook :** Chaque appel à `POST /payments/webhook` vérifie la signature Stripe (`stripe.webhooks.constructEvent`) avec `STRIPE_WEBHOOK_SECRET`. Corps de la requête consommé en raw bytes (`RawBodyMiddleware`).

---

## 6. Instant Book vs Validation Hôte

### 6.1 Deux modes de confirmation

| Mode | `instantBookEnabled` | `capture_method` Stripe | Statut initial |
|------|---------------------|------------------------|----------------|
| Instant Book | `true` | `automatic` | → `CONFIRMED` dès webhook `payment_intent.succeeded` |
| Validation hôte | `false` | `manual` | → `PENDING` jusqu'à approbation explicite |

Le champ `Listing.instantBookEnabled` (par défaut `false`) est le pivot de la logique.

### 6.2 Flow Instant Book (instantBookEnabled = true)

```
Locataire → POST /bookings          → Booking PENDING
         → POST /payments/intent    → PaymentIntent (capture_method: automatic)
         → confirm paiement (frontend Stripe.js)
         → webhook payment_intent.succeeded
         → Booking CONFIRMED + Payment CAPTURED + Transfer hôte
```

### 6.3 Flow Validation Hôte (instantBookEnabled = false)

```
Locataire → POST /bookings                → Booking PENDING + hostApprovalDeadline = now() + 24h
          → POST /payments/intent         → PaymentIntent (capture_method: manual)
          → authorize paiement (frontend) → fonds autorisés, non prélevés
          → notification hôte

Hôte → POST /bookings/:id/approve        → capture du PaymentIntent → CONFIRMED + Transfer
     → POST /bookings/:id/reject         → annulation PaymentIntent → CANCELLED (0 prélèvement)

Job nettoyage → si hostApprovalDeadline dépassée et status = PENDING
             → annulation PaymentIntent (fonds libérés)
             → Booking CANCELLED
```

### 6.4 Contrainte Stripe : fenêtre d'autorisation 7 jours

Une autorisation Stripe (`capture_method: manual`) expire après **7 jours**. Si l'hôte ne valide pas dans ce délai, la capture échouera (`payment_intent.capture` retourne une erreur Stripe `charge_already_expired`).

**Gestion de ce cas :**
- Le job de nettoyage doit vérifier `hostApprovalDeadline` < now() ET annuler avant l'expiration Stripe (24h par défaut, bien en dessous des 7 jours).
- Si malgré tout l'autorisation expire côté Stripe avant la deadline applicative (edge case : window configurée > 7 jours), le module `payments` intercepte l'erreur `charge_already_expired` et annule la réservation + notifie le locataire.
- **Ne jamais configurer `hostApprovalWindowHours` > 144h (6 jours)** — documenter cette limite dans l'interface admin.

### 6.5 Job de nettoyage des réservations PENDING

**Implémentation MVP :** cron NestJS (`@nestjs/schedule`) toutes les 15 minutes.

```typescript
// Pseudocode du job
SELECT * FROM "Booking"
WHERE status = 'PENDING'
  AND "hostApprovalDeadline" < now()

FOR EACH booking:
  → annuler le PaymentIntent Stripe (cancel, pas refund)
  → UPDATE Booking SET status = 'CANCELLED'
  → notifier locataire et hôte (email ou in-app — V2)
```

**Idempotence :** si le job s'exécute deux fois sur la même réservation (crash/redémarrage), la deuxième annulation Stripe renvoie une erreur `payment_intent_already_canceled` — à absorber sans erreur.

---

## 7. Cache Redis sur PlatformConfig

`PlatformConfig` est lue à chaque calcul de prix (création de réservation). Pour éviter une requête DB à chaque fois, elle est mise en cache Redis.

**Clé :** `platform:config`
**TTL :** 300 secondes (5 min)
**Invalidation :** explicite dans le service admin au moment de l'`UPDATE` sur `PlatformConfig`.

```typescript
// Algorithme dans PlatformConfigService (futur module admin)
async get(): Promise<PlatformConfig> {
  const cached = await this.redis.get<PlatformConfig>('platform:config');
  if (cached) return cached;
  const config = await this.prisma.platformConfig.findUniqueOrThrow({ where: { id: 'default' } });
  await this.redis.set('platform:config', config, 300);
  return config;
}

async update(data: UpdatePlatformConfigDto, adminId: string): Promise<PlatformConfig> {
  const current = await this.get();
  // Snapshot d'audit AVANT la modification
  await this.prisma.platformConfigHistory.create({
    data: { ...current, changedBy: adminId },
  });
  const updated = await this.prisma.platformConfig.update({ where: { id: 'default' }, data });
  await this.redis.del('platform:config'); // invalidation explicite
  return updated;
}
```

**Pourquoi pas un TTL court sans invalidation explicite :** le taux de commission est un champ critique pour la comptabilité. Un cache périmé de quelques minutes sur un changement de taux pourrait appliquer un mauvais taux à des réservations créées dans la fenêtre d'écart. L'invalidation explicite garantit la cohérence immédiate.

---

## 8. PlatformConfigHistory — audit trail

Table append-only (jamais de UPDATE ni DELETE). Chaque modification de `PlatformConfig` insère une ligne avec les valeurs AVANT modification, l'horodatage et l'identité de l'admin.

**Pourquoi les valeurs AVANT et pas APRÈS :** En cas de litige sur une commission, la question est « quel taux était appliqué au moment de la réservation X ? ». Le service de pricing lit `PlatformConfig` au moment de la réservation ; l'history permet de reconstruire quelle valeur était active à cet instant en cherchant la dernière ligne `changedAt < booking.createdAt`.

---

## 9. Ordre d'exécution des migrations manuelles

```
1. docker compose up postgres       # démarrer PostgreSQL
2. psql ... -f 0001_extensions.sql  # créer les extensions (superuser requis)
3. pnpm db:migrate                  # prisma migrate dev (crée les tables)
4. psql ... -f 0002_postgis_geometry.sql  # colonne geometry + trigger
5. psql ... -f 0003_booking_constraints.sql  # EXCLUDE + CHECK
```

Les migrations `0002` et `0003` ne sont pas gérées par Prisma Migrate et doivent être jouées manuellement (ou via un script de setup en CI).
