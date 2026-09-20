import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LISTING_TYPES } from '@/lib/listing';

/**
 * Types d'annonce sélectionnables (création, filtres) — restreints par le
 * flag ADMIN `enabledListingTypes` (voir /admin). Retourne la liste complète
 * pendant le chargement pour éviter un flash à vide.
 */
export function useEnabledListingTypes(): string[] {
  const [types, setTypes] = useState<string[]>(LISTING_TYPES);

  useEffect(() => {
    api.features
      .get()
      .then((r) => setTypes(LISTING_TYPES.filter((t) => r.flags.enabledListingTypes.includes(t))))
      .catch(() => {
        /* garde la liste complète si le flag est injoignable */
      });
  }, []);

  return types;
}
