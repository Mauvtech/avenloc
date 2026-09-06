import ListingCard from '@/components/listing-card';
import { LoadMore, SortSelect } from '@/components/search-controls';
import { EmptyState, ListingCardSkeleton } from '@/components/ui';
import type { SearchResult } from '@/lib/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
const DEFAULT_LIMIT = 24;

async function fetchResults(
  params: Record<string, string | string[] | undefined>,
): Promise<SearchResult> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    if (k === 'place') continue; // paramètre d'affichage uniquement (nom de ville saisi)
    qs.set(k, Array.isArray(v) ? v[0] : v);
  }
  if (!qs.has('limit')) qs.set('limit', String(DEFAULT_LIMIT));
  // Sans géolocalisation, le tri « distance » (défaut API) n'a pas de sens.
  if (!qs.has('sort') && !qs.has('lat')) qs.set('sort', 'newest');
  const res = await fetch(`${API_URL}/search?${qs.toString()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('search failed');
  return res.json() as Promise<SearchResult>;
}

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>
);

export default async function SearchResults({ searchParams }: Props) {
  const isSearch = ['lat', 'type', 'q', 'minPrice', 'maxPrice', 'maxGuests', 'amenities'].some(
    (k) => k in searchParams,
  );

  let result: SearchResult;
  try {
    result = await fetchResults(searchParams);
  } catch {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger-tint p-4 text-sm text-danger-fg">
        Impossible de charger les annonces pour le moment.
      </div>
    );
  }

  if (result.listings.length === 0) {
    return (
      <EmptyState icon="🔍" title={isSearch ? 'Aucun résultat' : 'Aucune annonce publiée'}>
        {isSearch
          ? 'Élargissez la zone ou assouplissez vos filtres.'
          : 'Revenez bientôt — les premières annonces arrivent.'}
      </EmptyState>
    );
  }

  const place = typeof searchParams.place === 'string' ? searchParams.place : null;
  const shown = result.listings.length;
  const currentLimit = Number(
    Array.isArray(searchParams.limit) ? searchParams.limit[0] : searchParams.limit,
  ) || DEFAULT_LIMIT;
  const hasMore = shown >= currentLimit && shown < result.total;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">
          {isSearch
            ? `${result.total} résultat${result.total > 1 ? 's' : ''}${place ? ` · ${place}` : ''}`
            : 'Annonces récentes'}
          <span className="font-normal text-muted">
            {' '}
            · {shown} affichée{shown > 1 ? 's' : ''}
          </span>
        </p>
        <SortSelect />
      </div>

      <Grid>
        {result.listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </Grid>

      {hasMore && <LoadMore nextLimit={currentLimit + DEFAULT_LIMIT} />}
    </section>
  );
}

SearchResults.Skeleton = function SearchResultsSkeleton() {
  return (
    <section className="space-y-4">
      <div className="h-5 w-40 skeleton" />
      <Grid>
        {Array.from({ length: 8 }, (_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </Grid>
    </section>
  );
};
