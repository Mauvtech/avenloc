-- Migration manuelle 0009 : rôle MODERATOR.
--
-- Peut modifier/dépublier/supprimer n'importe quelle annonce quel que soit son
-- propriétaire (modération de contenu). Pour l'instant, le rôle COMMERCIAL a
-- aussi ces droits en pratique (voir ListingsService.canModerate) — le temps
-- qu'une équipe modération dédiée existe. Aucun utilisateur n'a ce rôle par
-- défaut.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'MODERATOR';
