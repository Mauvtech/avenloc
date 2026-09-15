'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AddressAutocomplete from '@/components/address-autocomplete';
import DateRangeField from '@/components/date-range-field';
import TypeField from '@/components/type-field';
import FilterChips, { type Filters } from '@/components/filter-chips';
import { api } from '@/lib/api';
import type { GeoResult } from '@/lib/geo';
import type { SearchFacets } from '@/lib/types';

const DEFAULT_RADIUS_KM = 30;

const barSegment =
  'flex-1 px-5 py-2.5 sm:border-r sm:border-line last:sm:border-r-0 border-b sm:border-b-0 border-line last:border-b-0';
const bareInput =
  'w-full border-none bg-transparent p-0 text-sm text-ink outline-none placeholder:text-muted/70';

// Barre de recherche « Où / Quand / Type d'espace » + filtres en chips —
// design de référence : un seul champ pilule à 3 segments, calendrier et menu
// déroulant personnalisés (pas de contrôles natifs du navigateur).
export default function SearchBar() {
  const router = useRouter();
  const params = useSearchParams();

  const [locationText, setLocationText] = useState(params.get('place') ?? params.get('q') ?? '');
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(
    params.get('lat') && params.get('lng')
      ? { lat: Number(params.get('lat')), lng: Number(params.get('lng')) }
      : null,
  );
  const [startDate, setStartDate] = useState(params.get('startDate') ?? '');
  const [endDate, setEndDate] = useState(params.get('endDate') ?? '');
  const [type, setType] = useState(params.get('type') ?? '');
  const [filters, setFilters] = useState<Filters>({
    capacity: Number(params.get('maxGuests') ?? 0) || 0,
    maxPrice: params.get('maxPrice') ? Number(params.get('maxPrice')) : null,
    amenities: (params.get('amenities') ?? '').split(',').filter(Boolean),
    instant: params.get('instantBook') === 'true',
  });
  const [facets, setFacets] = useState<SearchFacets | null>(null);

  // Options de filtres dérivées du catalogue publié réel, pas du schéma
  // complet — cf. allTypes/allAmenities/maxPricePossible du design de référence.
  useEffect(() => {
    api.listings.facets().then(setFacets).catch(() => {});
  }, []);

  function applyExtraParams(p: URLSearchParams) {
    if (type) p.set('type', type);
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    if (filters.capacity) p.set('maxGuests', String(filters.capacity));
    if (filters.maxPrice) p.set('maxPrice', String(filters.maxPrice));
    if (filters.amenities.length) p.set('amenities', filters.amenities.join(','));
    if (filters.instant) p.set('instantBook', 'true');
    const sort = params.get('sort');
    if (sort) p.set('sort', sort);
  }

  // Filtres secondaires + type + dates : application immédiate (débounce).
  // « Où » reste soumis via le bouton, cf. handleSubmit.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      const lat = picked?.lat ?? (params.get('lat') ? Number(params.get('lat')) : null);
      const lng = picked?.lng ?? (params.get('lng') ? Number(params.get('lng')) : null);
      if (lat != null && lng != null) {
        p.set('lat', String(lat));
        p.set('lng', String(lng));
        p.set('radius', String(DEFAULT_RADIUS_KM));
        const place = params.get('place');
        if (place) p.set('place', place);
      } else if (params.get('q')) {
        p.set('q', params.get('q')!);
      }
      applyExtraParams(p);
      const qs = p.toString();
      router.push(qs ? `/?${qs}` : '/', { scroll: false });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, filters.capacity, filters.maxPrice, filters.amenities.join(','), filters.instant, startDate, endDate]);

  // « Où » ne déclenche une recherche géolocalisée que si l'utilisateur a
  // explicitement choisi une suggestion de l'autocomplete (coordonnées fiables).
  // Sinon, le texte tapé reste une recherche libre (q) — plus prévisible qu'un
  // géocodage automatique, qui peut faire correspondre un mot à un lieu-dit
  // homonyme sans rapport avec l'intention de l'utilisateur.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = locationText.trim();
    const p = new URLSearchParams();
    if (picked) {
      p.set('lat', String(picked.lat));
      p.set('lng', String(picked.lng));
      p.set('radius', String(DEFAULT_RADIUS_KM));
      if (raw) p.set('place', raw);
    } else if (raw) {
      p.set('q', raw);
    }
    applyExtraParams(p);
    const qs = p.toString();
    router.push(qs ? `/?${qs}` : '/');
  }

  return (
    <div>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-card sm:flex-row sm:items-stretch"
      >
        <div className={barSegment}>
          <div className="text-[11px] font-medium text-muted">Où</div>
          <AddressAutocomplete
            kind="city"
            value={locationText}
            onQueryChange={(t) => {
              setLocationText(t);
              if (picked) setPicked(null);
            }}
            onSelect={(r: GeoResult) => setPicked({ lat: r.latitude, lng: r.longitude })}
            placeholder="Ville, quartier…"
            inputClassName={bareInput}
          />
        </div>

        <div className={barSegment}>
          <DateRangeField
            bare
            label="Quand"
            placeholder=""
            startDate={startDate}
            endDate={endDate}
            onChange={({ startDate: s, endDate: e }) => {
              setStartDate(s);
              setEndDate(e);
            }}
          />
        </div>

        <div className={barSegment}>
          <TypeField bare label="Type d'espace" value={type} onChange={setType} allTypes={facets?.types} />
        </div>

        <button type="submit" className="btn-primary m-2 shrink-0 sm:my-2 sm:mr-2 sm:ml-0">
          Rechercher
        </button>
      </form>

      <FilterChips
        filters={filters}
        onChange={setFilters}
        allAmenities={facets?.amenities}
        maxPricePossible={facets?.maxPrice}
      />
    </div>
  );
}
