# Image de l'API NestJS. Contexte de build attendu : racine du repo.
#   docker build -f apps/api/Dockerfile -t aven-api .

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# openssl : requis pour que Prisma détecte la bonne cible moteur (debian-openssl-3.0.x)
# dès `prisma generate`, cohérente avec le runtime.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ── Dépendances (couche cache) ────────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @aven/api...

# ── Build (prisma generate + nest build) ─────────────────────────────────────
FROM deps AS build
COPY apps/api apps/api
RUN pnpm --filter @aven/api exec prisma generate \
 && pnpm --filter @aven/api build \
 && pnpm --filter @aven/api exec tsc prisma/seed.ts prisma/photo-catalog.ts \
      --outDir prisma/dist --module commonjs --target ES2021 \
      --moduleResolution node --esModuleInterop --skipLibCheck --resolveJsonModule

# ── Runtime ─────────────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production
# psql : utilisé par scripts/release.sh pour appliquer les migrations SQL manuelles.
RUN apt-get update \
 && apt-get install -y --no-install-recommends postgresql-client \
 && rm -rf /var/lib/apt/lists/*

# node_modules complet (inclut prisma CLI + ts-node, nécessaires au release).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
COPY --from=build /app/package.json /app/pnpm-workspace.yaml ./
COPY apps/api/scripts ./apps/api/scripts
RUN chmod +x apps/api/scripts/release.sh

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["scripts/release.sh"]
