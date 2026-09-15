'use client';

import { useState } from 'react';
import { AMENITY_OPTIONS, amenityLabel } from '@/lib/listing';

const CAPACITY_STEPS = [1, 2, 4, 6, 10];
const MAX_PRICE_CEILING = 300;

export interface Filters {
  capacity: number; // 0 = indifférent
  maxPrice: number | null; // null = indifférent
  amenities: string[];
  instant: boolean;
}

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
  // Équipements et prix max réellement présents dans le catalogue publié
  // (facets API) — replie sur le schéma complet tant que non chargé.
  allAmenities?: string[];
  maxPricePossible?: number;
}

// Filtres secondaires en chips — capacité, prix (jauge), équipements,
// réservation instantanée. Chaque chip ouvre son propre panneau au clic.
export default function FilterChips({ filters, onChange, allAmenities, maxPricePossible }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const priceCeiling = maxPricePossible ?? MAX_PRICE_CEILING;
  const amenities = allAmenities ?? AMENITY_OPTIONS;
  const sliderValue = filters.maxPrice ?? priceCeiling;

  function toggleAmenity(a: string) {
    onChange({
      ...filters,
      amenities: filters.amenities.includes(a)
        ? filters.amenities.filter((x) => x !== a)
        : [...filters.amenities, a],
    });
  }

  const hasActive =
    filters.capacity > 0 || filters.maxPrice !== null || filters.amenities.length > 0 || filters.instant;

  const chips: { key: string; label: string; active: boolean; toggle?: boolean }[] = [
    {
      key: 'capacite',
      label: filters.capacity ? `${filters.capacity}+ personnes` : 'Capacité',
      active: filters.capacity > 0,
    },
    {
      key: 'prix',
      label: filters.maxPrice ? `Jusqu'à ${filters.maxPrice} €` : 'Prix',
      active: filters.maxPrice !== null,
    },
    {
      key: 'amenities',
      label: filters.amenities.length ? `Équipements · ${filters.amenities.length}` : 'Équipements',
      active: filters.amenities.length > 0,
    },
    { key: 'instant', label: 'Réservation instantanée', active: filters.instant, toggle: true },
  ];

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() =>
              c.toggle ? onChange({ ...filters, instant: !filters.instant }) : setOpen(open === c.key ? null : c.key)
            }
            className={`chip ${c.active || open === c.key ? 'chip-active' : ''}`}
          >
            {c.label}
          </button>
        ))}
        {hasActive && (
          <button
            type="button"
            onClick={() => onChange({ capacity: 0, maxPrice: null, amenities: [], instant: false })}
            className="text-sm font-semibold text-muted underline hover:text-ink"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {open === 'capacite' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {CAPACITY_STEPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...filters, capacity: filters.capacity === c ? 0 : c })}
              className={`chip ${filters.capacity === c ? 'chip-active' : ''}`}
            >
              {c}+ personnes
            </button>
          ))}
        </div>
      )}

      {open === 'prix' && (
        <div className="mt-3 max-w-xs">
          <div className="mb-2 text-sm text-ink">
            Jusqu&apos;à <strong>{sliderValue} €</strong>
          </div>
          <input
            type="range"
            min={10}
            max={priceCeiling}
            step={5}
            value={sliderValue}
            onChange={(e) => {
              const v = Number(e.target.value);
              onChange({ ...filters, maxPrice: v >= priceCeiling ? null : v });
            }}
            className="w-full accent-brand"
          />
          <div className="mt-0.5 flex justify-between text-xs text-muted">
            <span>10 €</span>
            <span>{priceCeiling}+ €</span>
          </div>
        </div>
      )}

      {open === 'amenities' && (
        <div className="mt-3 flex flex-wrap gap-2">
          {amenities.map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => toggleAmenity(a)}
              className={`chip ${filters.amenities.includes(a) ? 'chip-active' : ''}`}
            >
              {amenityLabel(a)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
