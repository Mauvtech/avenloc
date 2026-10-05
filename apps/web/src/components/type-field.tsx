'use client';

import { useEffect, useRef, useState } from 'react';
import { typeLabel } from '@/lib/listing';

interface Props {
  value: string;
  onChange: (value: string) => void;
  types: string[];
}

/** Sélecteur "Type d'espace" de la barre de recherche, façon TypeField du
 * prototype : un déclencheur texte (pas un <select> natif) qui ouvre un
 * panneau listant "Indifférent" + les types, avec la ligne active surlignée. */
export default function TypeField({ value, onChange, types }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const label = value ? typeLabel(value) : 'Indifférent';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`block w-full py-0.5 text-left text-sm ${open ? 'font-semibold text-brand-fg' : 'text-ink'}`}
      >
        {label}
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-30 mt-2 max-h-[280px] w-[min(16rem,90vw)] overflow-y-auto rounded-lg border border-line bg-surface shadow-modal"
        >
          <button
            type="button"
            role="option"
            aria-selected={value === ''}
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className={`block w-full px-4 py-3.5 text-left text-sm ${value === '' ? 'bg-canvas' : 'hover:bg-canvas'}`}
          >
            Indifférent
          </button>
          {types.map((t) => (
            <button
              key={t}
              type="button"
              role="option"
              aria-selected={value === t}
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              className={`block w-full px-4 py-3.5 text-left text-sm ${value === t ? 'bg-canvas' : 'hover:bg-canvas'}`}
            >
              {typeLabel(t)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
