'use client';

import { useEffect, useRef, useState } from 'react';
import { LISTING_TYPES, typeLabel } from '@/lib/listing';

interface Props {
  value: string; // '' = Indifférent
  onChange: (type: string) => void;
  bare?: boolean;
  label?: string;
  // Types réellement présents dans le catalogue publié (facets API) — replie
  // sur la liste complète du schéma tant que non chargé.
  allTypes?: string[];
}

// Menu déroulant personnalisé (pas de <select> natif) — valeur interne ''
// affichée comme « Indifférent » dans la liste, vide par défaut dans le champ.
export default function TypeField({ value, onChange, bare = false, label, allTypes }: Props) {
  const types = allTypes ?? LISTING_TYPES;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  function pick(t: string) {
    onChange(t);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <div className={bare ? '' : 'field p-0'}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={bare ? 'w-full text-left' : 'w-full px-3 py-2.5 text-left'}
        >
          {label && <div className="text-[11px] font-medium text-muted">{label}</div>}
          <span className="min-h-[20px] text-ink">{value ? typeLabel(value) : ' '}</span>
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-[min(16rem,90vw)] overflow-y-auto rounded-lg border border-line bg-surface py-1 shadow-modal">
          <button
            type="button"
            onClick={() => pick('')}
            className={`block w-full px-4 py-2 text-left text-sm ${value === '' ? 'bg-canvas font-semibold text-ink' : 'text-ink hover:bg-canvas'}`}
          >
            Indifférent
          </button>
          {types.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => pick(t)}
              className={`block w-full px-4 py-2 text-left text-sm ${value === t ? 'bg-canvas font-semibold text-ink' : 'text-ink hover:bg-canvas'}`}
            >
              {typeLabel(t)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
