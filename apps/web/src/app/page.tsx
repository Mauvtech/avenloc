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
    <div>
      <h1 className="mb-5 text-[28px] font-bold tracking-[-0.01em]">Trouvez votre espace de travail</h1>
      <SearchForm />

      <Suspense key={suspenseKey} fallback={<SearchResults.Skeleton />}>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
