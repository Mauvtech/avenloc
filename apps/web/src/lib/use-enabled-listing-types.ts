import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LISTING_TYPES, PROTOTYPE_TYPE_OPTIONS } from '@/lib/listing';

/**
 * Types d'annonce sélectionnables (création, filtres) — restreints par le
 * flag ADMIN `enabledListingTypes` (voir /admin). Les espaces professionnels du
 * prototype servent de valeur initiale, y compris lorsque l'API est indisponible.
 */
export function useEnabledListingTypes(): string[] {
  const [types, setTypes] = useState<string[]>(PROTOTYPE_TYPE_OPTIONS.map((option) => option.value));

  useEffect(() => {
    api.features
      .get()
      .then((r) => setTypes(LISTING_TYPES.filter((t) => r.flags.enabledListingTypes.includes(t))))
      .catch(() => {
        /* conserve les catégories professionnelles si le flag est injoignable */
      });
  }, []);

  return types;
}
