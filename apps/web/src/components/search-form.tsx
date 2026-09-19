'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AddressAutocomplete from '@/components/address-autocomplete';
import DateRangeField from '@/components/date-range-field';
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
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [instant, setInstant] = useState(params.get('instantBook') === 'true');
  const [submitting, setSubmitting] = useState(false);

  const activeFilters =
    (type ? 1 : 0) +
    (maxGuests ? 1 : 0) +
    (minPrice ? 1 : 0) +
    (maxPrice ? 1 : 0) +
    amenities.length + (instant ? 1 : 0);

  const [locError, setLocError] = useState<string | null>(null);

  // Construit l'URL de recherche à partir de l'état courant + coords connues
  // (sans géocodage : `picked` ou les paramètres d'URL existants).
  function buildQuery(): string {
    const p = new URLSearchParams();
    const lat = picked?.lat ?? (params.get('lat') ? Number(params.get('lat')) : null);
    const lng = picked?.lng ?? (params.get('lng') ? Number(params.get('lng')) : null);
    if (lat != null && lng != null) {
      p.set('lat', String(lat));
      p.set('lng', String(lng));
      p.set('radius', radius || '25');
      const place = locationText.trim() || params.get('place') || '';
      if (place) p.set('place', place);
    }
    if (type) p.set('type', type);
    if (startDate) p.set('startDate', startDate);
    if (endDate) p.set('endDate', endDate);
    if (maxGuests) p.set('maxGuests', maxGuests);
    if (minPrice) p.set('minPrice', minPrice);
    if (maxPrice) p.set('maxPrice', maxPrice);
    if (amenities.length) p.set('amenities', amenities.join(','));
    if (instant) p.set('instantBook', 'true');
    const sort = params.get('sort');
    if (sort) p.set('sort', sort);
    return p.toString();
  }

  // Application immédiate (débounce) des filtres — hors champ « Lieu » qui exige
  // un géocodage et reste soumis via le bouton.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const t = setTimeout(() => {
      const qs = buildQuery();
      router.push(qs ? `/?${qs}` : '/', { scroll: false });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, minPrice, maxPrice, maxGuests, amenities.join(','), startDate, endDate, instant, radius]);

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
    if (instant) p.set('instantBook', 'true');
      const sort = params.get('sort');
      if (sort) p.set('sort', sort);
      const qs = p.toString();
      router.push(qs ? `/?${qs}` : '/');
    } finally {
      setSubmitting(false);
    }
  }

  function chip(key: string, label: string, active: boolean) {
    return <button type="button" aria-expanded={openFilter === key} onClick={() => setOpenFilter(openFilter === key ? null : key)} className={`chip ${active || openFilter === key ? 'chip-active' : ''}`}>{label}</button>;
  }

  return (
    <form onSubmit={handleSubmit} className="relative z-30">
      <div className="marketplace-search">
        <div className="marketplace-search-field">
          <label className="label" htmlFor="search-location">Où</label>
          <AddressAutocomplete id="search-location" kind="city" value={locationText}
            onQueryChange={(t) => { setLocationText(t); setLocError(null); setPicked(null); }}
            onSelect={(r: GeoResult) => setPicked({ lat: r.latitude, lng: r.longitude })}
            placeholder="" />
        </div>
        <div className="marketplace-search-field">
          <span className="label">Quand</span>
          <DateRangeField startDate={startDate} endDate={endDate} onChange={({ startDate: s, endDate: e }) => { setStartDate(s); setEndDate(e); }} />
        </div>
        <div className="marketplace-search-field">
          <label className="label" htmlFor="search-type">Type d’espace</label>
          <select id="search-type" value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-transparent text-sm outline-none">
            <option value=""> </option>
            {LISTING_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
          </select>
        </div>
        <button type="submit" disabled={submitting} className="marketplace-search-submit">{submitting ? 'Recherche…' : 'Rechercher'}</button>
      </div>
      {locError && <p role="alert" className="mt-2 text-sm text-danger-fg">{locError}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        {chip('capacity', maxGuests ? `${maxGuests}+ personnes` : 'Capacité', !!maxGuests)}
        {chip('price', maxPrice ? `Jusqu’à ${maxPrice} €` : 'Prix', !!(maxPrice || minPrice))}
        {chip('amenities', amenities.length ? `Équipements · ${amenities.length}` : 'Équipements', !!amenities.length)}
        <button type="button" aria-pressed={instant} onClick={() => setInstant(!instant)} className={`chip ${instant ? 'chip-active' : ''}`}>Réservation instantanée</button>
        {picked && chip('radius', `Rayon ${radius} km`, radius !== '25')}
        {activeFilters > 0 && <button type="button" className="text-[13px] text-muted underline" onClick={() => { setType(''); setMaxGuests(''); setMinPrice(''); setMaxPrice(''); setAmenities([]); setInstant(false); setOpenFilter(null); }}>Réinitialiser</button>}
      </div>
      {openFilter === 'capacity' && <div className="mt-3 flex flex-wrap gap-2">
        {[1, 2, 4, 6, 10].map((n) => <button key={n} type="button" className={`chip ${maxGuests === String(n) ? 'chip-active' : ''}`} onClick={() => setMaxGuests(maxGuests === String(n) ? '' : String(n))}>{n}+ personnes</button>)}
        <label className="flex items-center gap-2 text-[13px] text-muted">Autre <input aria-label="Capacité minimale" type="number" min="1" value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} className="field w-20" /></label>
      </div>}
      {openFilter === 'price' && <div className="mt-3 max-w-xs space-y-2 text-[13px]">
        <label htmlFor="price-range">Jusqu’à <strong>{maxPrice || 500} €</strong></label>
        <input id="price-range" type="range" min="10" max="500" step="5" value={maxPrice || '500'} onChange={(e) => setMaxPrice(e.target.value === '500' ? '' : e.target.value)} className="w-full accent-ink" />
        <div className="grid grid-cols-2 gap-3">
          <label>Prix min (€)<input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="field mt-1" /></label>
          <label>Prix max (€)<input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="field mt-1" /></label>
        </div>
      </div>}
      {openFilter === 'amenities' && <div className="mt-3 flex flex-wrap gap-2">
        {AMENITIES.map((a) => <button key={a} type="button" aria-pressed={amenities.includes(a)} onClick={() => setAmenities((cur) => cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a])} className={`chip capitalize ${amenities.includes(a) ? 'chip-active' : ''}`}>{a === 'wifi' ? 'Wi-Fi' : a}</button>)}
      </div>}
      {openFilter === 'radius' && <label className="mt-3 block max-w-xs text-sm">Rayon de recherche (km)<input type="number" min="1" max="100" value={radius} onChange={(e) => setRadius(e.target.value)} className="field mt-1" /></label>}
    </form>
  );
}
