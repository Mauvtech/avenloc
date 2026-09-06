'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const SORTS: [string, string][] = [
  ['', 'Pertinence'],
  ['price_asc', 'Prix croissant'],
  ['price_desc', 'Prix décroissant'],
  ['newest', 'Plus récentes'],
];

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get('sort') ?? '';

  const onChange = (v: string) => {
    const next = new URLSearchParams(params.toString());
    if (v) next.set('sort', v);
    else next.delete('sort');
    next.delete('limit');
    router.push(`${pathname}?${next.toString()}`);
  };

  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      className="field w-auto py-1.5 text-[13px]"
      aria-label="Trier"
    >
      {SORTS.map(([v, label]) => (
        <option key={v} value={v}>
          Tri : {label}
        </option>
      ))}
    </select>
  );
}

export function LoadMore({ nextLimit }: { nextLimit: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const more = useCallback(() => {
    const next = new URLSearchParams(params.toString());
    next.set('limit', String(nextLimit));
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }, [router, pathname, params, nextLimit]);

  return (
    <div className="flex justify-center pt-2">
      <button onClick={more} className="btn-ghost">
        Afficher plus d&apos;annonces
      </button>
    </div>
  );
}
