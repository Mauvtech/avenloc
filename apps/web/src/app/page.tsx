import { Suspense } from 'react';
import SearchBar from '@/components/search-bar';
import { Hero } from '@/components/home-sections';
import SearchResults from './search-results';

interface PageProps {
  searchParams: Record<string, string | string[] | undefined>;
}

export default function Home({ searchParams }: PageProps) {
  const suspenseKey = new URLSearchParams(
    Object.entries(searchParams).flatMap(([k, v]) =>
      v === undefined ? [] : [[k, Array.isArray(v) ? v[0] : v]],
    ) as [string, string][],
  ).toString();

  return (
    <div className="space-y-8">
      <Hero>
        <SearchBar />
      </Hero>

      <Suspense key={suspenseKey} fallback={<SearchResults.Skeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
