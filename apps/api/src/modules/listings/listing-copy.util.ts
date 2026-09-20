/** Le texte public décrit l'espace ; l'adresse reste dans ses champs dédiés. */
export function cleanListingDescription(description: string, addressLine1?: string | null, addressLine2?: string | null): string {
  let text = description;
  for (const address of [addressLine1, addressLine2].filter((value): value is string => Boolean(value?.trim()))) {
    const escaped = address.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    text = text.replace(new RegExp(`(?:,?\\s*(?:situ[ée]e?s?\\s+)?(?:au|à|a|adresse\\s*:)\\s+)?${escaped}(?:,?\\s*\\d{5})?\\s*,?`, 'giu'), ' ');
  }
  return text.replace(/[—–]/g, ', ').replace(/^\s*-\s+/gm, '').replace(/\s+-\s+/g, ', ')
    .replace(/ +/g, ' ').replace(/\s+([,.])/g, '$1').replace(/,\s*,/g, ',').trim();
}
