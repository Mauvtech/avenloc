# Tests de la migration horaire

Tests exécutés sur PostgreSQL embarqué (PGlite), avec les vraies extensions
`btree_gist` et `pgcrypto`. Aucune connexion à Railway ni à une base externe.
PostGIS n'est pas chargé : ces tests ne couvrent pas la recherche géographique.

Depuis la racine du dépôt, avec les dépendances de l'API déjà installées :

```sh
npm ci --prefix apps/api/scripts/migration-tests
npm test --prefix apps/api/scripts/migration-tests
sh -n apps/api/scripts/release.sh
```

La fixture `fixtures/before-hourly.sql` correspond au schéma Prisma du commit
`fb6afee`, généré avec `prisma migrate diff --from-empty`. Le test d'initialisation
neuve génère le SQL depuis le schéma Prisma courant, sans accès à une base.

Les six scénarios couvrent la conservation des lignes et montants, les dates
été/hiver indépendamment du fuseau de session, les contraintes anti-chevauchement,
les bornes exclusives, une deuxième exécution, le rollback après échec, un schéma
ambigu et une base neuve. L'exécution du client psql et le démarrage Docker ne sont
pas couverts par PGlite.
