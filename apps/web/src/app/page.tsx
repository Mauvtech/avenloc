import { Suspense } from 'react';
import SearchForm from '@/components/search-form';
import { CategoryTiles, Hero, HowItWorks } from '@/components/home-sections';
import SearchResults from './search-results';

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

const FILTER_KEYS = ['lat', 'type', 'q', 'minPrice', 'maxPrice', 'maxGuests', 'amenities', 'startDate'];

export default function Home({ searchParams }: PageProps) {
  const suspenseKey = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) =>
      v === undefined ? [] : [[k, Array.isArray(v) ? v[0] : v]],
    ) as [string, string][],
  ).toString();

  // Recherche active dès qu'un filtre est présent dans l'URL.
  const isBrowsing = FILTER_KEYS.some((k) => k in searchParams);

  return (
    <div className="space-y-10">
      <Hero>
        <SearchForm />
      </Hero>

      {!isBrowsing && (
        <>
          <CategoryTiles />
          <HowItWorks />
        </>
      )}

      <Suspense key={suspenseKey} fallback={<SearchResults.Skeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
