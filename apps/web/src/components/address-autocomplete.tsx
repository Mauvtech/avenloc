'use client';

import { useEffect, useRef, useState } from 'react';
import { geocode, type GeoResult } from '@/lib/geo';

interface Props {
  value: string;
  onQueryChange: (text: string) => void;
  onSelect: (result: GeoResult) => void;
  placeholder?: string;
  /** "city" restreint aux communes, "address" cherche jusqu'au numéro. */
  kind?: 'address' | 'city';
  className?: string;
}

export default function AddressAutocomplete({
  value,
  onQueryChange,
  onSelect,
  placeholder,
  kind = 'address',
  className,
}: Props) {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const skipNextFetch = useRef(false);

  useEffect(() => {
    if (skipNextFetch.current) {
      skipNextFetch.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      geocode(q, kind === 'city' ? { type: 'municipality', limit: 5 } : { limit: 5 })
        .then((r) => {
          setResults(r);
          setOpen(r.length > 0);
          setActiveIdx(-1);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [value, kind]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function choose(r: GeoResult) {
    skipNextFetch.current = true;
    onSelect(r);
    onQueryChange(kind === 'city' ? `${r.city} (${r.postalCode})` : r.label);
    setOpen(false);
    setResults([]);
  }

  return (
    <div ref={boxRef} className={`relative ${className ?? ''}`}>
      <input
        type="text"
        className="field"
        autoComplete="off"
        placeholder={placeholder ?? 'Commencez à taper une adresse…'}
        value={value}
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={(e) => {
          if (!open || results.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIdx((i) => Math.min(i + 1, results.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIdx((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && activeIdx >= 0) {
            e.preventDefault();
            choose(results[activeIdx]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {loading && <span className="absolute right-3 top-2.5 text-xs text-muted">…</span>}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded border border-line bg-white shadow-modal">
          {results.map((r, i) => (
            <li key={r.id}>
              <button
                type="button"
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => choose(r)}
                className={`block w-full px-3 py-2 text-left text-sm ${
                  i === activeIdx ? 'bg-brand-tint' : 'hover:bg-canvas'
                }`}
              >
                <span className="font-medium">
                  {kind === 'city' ? r.city : r.addressLine1 || r.city}
                </span>
                <span className="text-muted">
                  {kind === 'city' ? ` · ${r.context}` : ` — ${r.postalCode} ${r.city}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
