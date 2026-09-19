-- Migration manuelle 0008 : rôle ADMIN + persistance des feature flags.
--
-- Auparavant, PATCH /features n'était protégé que par une variable d'env
-- (FEATURES_ADMIN) : n'importe quel visiteur pouvait basculer les flags hors
-- production, et leur valeur ne survivait pas à un redémarrage. Désormais,
-- seul un compte au rôle ADMIN peut les modifier (FeaturesController), et ils
-- sont persistés ici plutôt qu'en mémoire.

-- 1. Nouvelle valeur d'enum — safe à rejouer (IF NOT EXISTS).
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';

-- 2. Singleton des flags. simulatePayments=true par défaut : le vrai paiement
--    Stripe n'est pas encore prêt pour de vrais utilisateurs, donc invisible
--    tant qu'un admin ne l'active pas explicitement.
CREATE TABLE IF NOT EXISTS "FeatureFlagState" (
  id TEXT PRIMARY KEY DEFAULT 'default',
  flags JSONB NOT NULL DEFAULT '{"simulatePayments": true}'::jsonb,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO "FeatureFlagState" (id, flags)
VALUES ('default', '{"simulatePayments": true}'::jsonb)
ON CONFLICT (id) DO NOTHING;
