// Géocodage via la Base Adresse Nationale (adresse.data.gouv.fr).
// API publique, gratuite, sans clé — adaptée aux adresses françaises.
// https://adresse.data.gouv.fr/api-doc/adresse

const BAN_URL = 'https://api-adresse.data.gouv.fr/search/';

export interface GeoResult {
  id: string;
  label: string; // "8 Boulevard du Port 80000 Amiens"
  addressLine1: string; // "8 Boulevard du Port"
  city: string;
  postalCode: string;
  context: string; // "80, Somme, Hauts-de-France"
  latitude: number;
  longitude: number;
  kind: string; // "housenumber" | "street" | "municipality" | ...
}

interface BanFeature {
  geometry: { coordinates: [number, number] }; // [lng, lat]
  properties: {
    id: string;
    label: string;
    name: string;
    postcode: string;
    city: string;
    context: string;
    type: string;
  };
}

function toResult(f: BanFeature): GeoResult {
  const [lng, lat] = f.geometry.coordinates;
  return {
    id: f.properties.id,
    label: f.properties.label,
    addressLine1: f.properties.name,
    city: f.properties.city,
    postalCode: f.properties.postcode,
    context: f.properties.context,
    latitude: lat,
    longitude: lng,
    kind: f.properties.type,
  };
}

interface GeocodeOptions {
  limit?: number;
  /** Restreint le type de résultat, ex. "municipality" pour une recherche de ville. */
  type?: string;
}

export async function geocode(query: string, opts: GeocodeOptions = {}): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const params = new URLSearchParams({
    q,
    limit: String(opts.limit ?? 5),
    autocomplete: '1',
  });
  if (opts.type) params.set('type', opts.type);

  const res = await fetch(`${BAN_URL}?${params.toString()}`);
  if (!res.ok) throw new Error('Service de géocodage indisponible');

  const data = (await res.json()) as { features: BanFeature[] };
  return data.features.map(toResult);
}

/** Résout une ville en coordonnées (une seule correspondance). */
export async function geocodeCity(query: string): Promise<GeoResult | null> {
  const municipality = await geocode(query, { limit: 1, type: 'municipality' });
  if (municipality[0]) return municipality[0];
  const fallback = await geocode(query, { limit: 1 });
  return fallback[0] ?? null;
}
