import { Suspense } from 'react';
import SearchForm from '@/components/search-form';
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
      <section className="space-y-3 pt-2 text-center sm:pt-6">
        <h1 className="text-3xl font-extrabold sm:text-[40px] sm:leading-[1.1]">
          L&apos;espace qu&apos;il vous faut,
          <br className="hidden sm:block" /> réservé en quelques clics
        </h1>
        <p className="mx-auto max-w-xl text-muted">
          Appartements, bureaux, salles de réunion, ateliers, entrepôts et parkings — partout en France.
        </p>
      </section>

      <SearchForm />

      <Suspense
        key={suspenseKey}
        fallback={<SearchResults.Skeleton />}
      >
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
