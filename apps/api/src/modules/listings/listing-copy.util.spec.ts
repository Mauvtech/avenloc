import { cleanListingDescription } from './listing-copy.util';

describe('public listing descriptions', () => {
  it('removes an exact street address and its postcode from generated copy', () => {
    const text = cleanListingDescription('Bureau lumineux situé au 12 Rue de la Paix, 75002 Paris. Accès facile.', '12 Rue de la Paix');
    expect(text).not.toContain('12 Rue');
    expect(text).not.toContain('75002');
    expect(text).toContain('Accès facile.');
  });
  it('handles address punctuation and case without treating it as a regular expression', () => {
    expect(cleanListingDescription('Studio au 4 bis (B) Rue des Fleurs. Calme.', '4 BIS (B) Rue des Fleurs')).not.toMatch(/4 bis/i);
  });
  it('removes separator dashes while preserving meaningful hyphenated words', () => {
    expect(cleanListingDescription('Lumineux — calme\n- Wi-Fi inclus\n- Accès de plain-pied')).toBe('Lumineux, calme\nWi-Fi inclus\nAccès de plain-pied');
  });
});
