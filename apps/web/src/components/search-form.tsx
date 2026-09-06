'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CategoryIcon from '@/components/category-icon';
import AddressAutocomplete from '@/components/address-autocomplete';
import { geocodeCity, type GeoResult } from '@/lib/geo';
import { LISTING_TYPES, typeLabel } from '@/lib/listing';

const CITY_FALLBACK: Record<string, { lat: number; lng: number }> = {
  paris: { lat: 48.8566, lng: 2.3522 },
  lyon: { lat: 45.764, lng: 4.8357 },
  marseille: { lat: 43.2965, lng: 5.3698 },
  bordeaux: { lat: 44.8378, lng: -0.5792 },
  toulouse: { lat: 43.6047, lng: 1.4442 },
  nantes: { lat: 47.2184, lng: -1.5536 },
};

const AMENITIES = ['wifi', 'parking', 'cuisine', 'climatisation'];

export default function SearchForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [locationText, setLocationText] = useState(params.get('place') ?? '');
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(
    params.get('lat') && params.get('lng')
      ? { lat: Number(params.get('lat')), lng: Number(params.get('lng')) }
      : null,
  );
  const [startDate, setStartDate] = useState(params.get('startDate') ?? '');
  const [endDate, setEndDate] = useState(params.get('endDate') ?? '');
  const [type, setType] = useState(params.get('type') ?? '');
  const [maxGuests, setMaxGuests] = useState(params.get('maxGuests') ?? '');
  const [minPrice, setMinPrice] = useState(params.get('minPrice') ?? '');
  const [maxPrice, setMaxPrice] = useState(params.get('maxPrice') ?? '');
  const [radius, setRadius] = useState(params.get('radius') ?? '25');
  const [amenities, setAmenities] = useState<string[]>(
    (params.get('amenities') ?? '').split(',').filter(Boolean),
  );
  const [showFilters, setShowFilters] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const activeFilters =
    (type ? 1 : 0) +
    (maxGuests ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    amenities.length;

  const [locError, setLocError] = useState<string | null>(null);

  // Renvoie des coords si un lieu est fourni, null si le champ est vide
  // (→ recherche « toutes villes »), ou `false` si le lieu est introuvable.
  async function resolveCoords(): Promise<{ lat: number; lng: number } | null | false> {
    if (picked) return picked;
    const raw = locationText.trim();
    if (!raw) return null;
    const key = raw.toLowerCase().replace(/\s*\(\d{4,5}\)\s*$/, '');
    if (CITY_FALLBACK[key]) return CITY_FALLBACK[key];
    try {
      const r = await geocodeCity(raw);
      if (r) return { lat: r.latitude, lng: r.longitude };
    } catch {
      /* ignore */
    }
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setLocError(null);
    try {
      const coords = await resolveCoords();
      if (coords === false) {
        setLocError('Ville introuvable — vérifiez l’orthographe ou choisissez une suggestion.');
        return;
      }
      const p = new URLSearchParams();
      if (coords) {
        p.set('lat', String(coords.lat));
        p.set('lng', String(coords.lng));
        p.set('radius', radius || '25');
        if (locationText.trim()) p.set('place', locationText.trim());
      }
      if (type) p.set('type', type);
      if (startDate) p.set('startDate', startDate);
      if (endDate) p.set('endDate', endDate);
      if (maxGuests) p.set('maxGuests', maxGuests);
      if (minPrice) p.set('minPrice', minPrice);
      if (maxPrice) p.set('maxPrice', maxPrice);
      if (amenities.length) p.set('amenities', amenities.join(','));
      const sort = params.get('sort');
      if (sort) p.set('sort', sort);
      const qs = p.toString();
      router.push(qs ? `/?${qs}` : '/');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card overflow-hidden">
      <div className="grid grid-cols-1 gap-3 p-3 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-end">
        <div>
          <label className="label">Lieu</label>
          <AddressAutocomplete
            kind="city"
            value={locationText}
            onQueryChange={(t) => {
              setLocationText(t);
              setLocError(null);
              if (picked) setPicked(null);
            }}
            onSelect={(r: GeoResult) => setPicked({ lat: r.latitude, lng: r.longitude })}
            placeholder="Toute la France"
          />
          {locError && <p className="mt-1 text-xs text-danger-fg">{locError}</p>}
        </div>
        <div>
          <label className="label">Arrivée</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="field" />
        </div>
        <div>
          <label className="label">Départ</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="field" />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary sm:h-[42px]">
          {submitting ? '…' : 'Rechercher'}
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-line px-3 py-2">
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className="text-sm font-semibold text-muted hover:text-ink"
        >
          {showFilters ? 'Masquer les filtres' : 'Filtres'}
          {activeFilters > 0 && !showFilters && (
            <span className="ml-1.5 rounded-full bg-brand px-1.5 text-[11px] font-bold text-white">
              {activeFilters}
            </span>
          )}
        </button>
        <span className="text-xs text-muted">Rayon {radius} km</span>
      </div>

      {showFilters && (
        <div className="space-y-4 border-t border-line bg-canvas p-3">
          <div>
            <label className="label">Type d&apos;espace</label>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
              {LISTING_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(type === t ? '' : t)}
                  className={`chip ${type === t ? 'chip-active' : ''}`}
                >
                  <CategoryIcon type={t} size={15} />
                  <span className="whitespace-nowrap">{typeLabel(t)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="label">Locataires</label>
              <input type="number" min="1" value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} className="field" />
            </div>
            <div>
              <label className="label">Prix min (€)</label>
              <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="field" />
            </div>
            <div>
              <label className="label">Prix max (€)</label>
              <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="field" />
            </div>
            <div>
              <label className="label">Rayon (km)</label>
              <input type="number" min="1" max="100" value={radius} onChange={(e) => setRadius(e.target.value)} className="field" />
            </div>
          </div>

          <div>
            <label className="label">Équipements</label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() =>
                    setAmenities((cur) =>
                      cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a],
                    )
                  }
                  className={`chip capitalize ${amenities.includes(a) ? 'chip-active' : ''}`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
