'use client';

import { useState } from 'react';
import { AMENITY_OPTIONS, amenityLabel } from '@/lib/listing';

interface Props {
  value: string[];
  onChange: (value: string[]) => void;
}

// Sélecteur d'équipements en chips + tag personnalisé — voir EquipmentsFaqForm
// dans le design de référence. Remplace le champ texte "séparé par des virgules".
export default function AmenitiesPicker({ value, onChange }: Props) {
  const [customTag, setCustomTag] = useState('');
  const options = [...new Set([...AMENITY_OPTIONS, ...value])];

  function toggle(a: string) {
    onChange(value.includes(a) ? value.filter((x) => x !== a) : [...value, a]);
  }

  function addCustomTag() {
    const t = customTag.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setCustomTag('');
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((a) => {
          const active = value.includes(a);
          const isCustom = !AMENITY_OPTIONS.includes(a);
          return (
            <button
              key={a}
              type="button"
              onClick={() => toggle(a)}
              className={`chip ${active ? 'chip-active' : ''}`}
            >
              {amenityLabel(a)}
              {isCustom && active && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(value.filter((x) => x !== a));
                  }}
                  className="ml-1 opacity-80"
                >
                  ✕
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustomTag();
            }
          }}
          placeholder="Ajouter un équipement non listé"
          className="field flex-1"
        />
        <button type="button" onClick={addCustomTag} className="btn-ghost">
          Ajouter
        </button>
      </div>
    </div>
  );
}
