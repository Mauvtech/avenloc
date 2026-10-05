'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-tint text-2xl text-danger-fg">
        ⚠️
      </div>
      <h1 className="text-2xl font-extrabold">Une erreur est survenue</h1>
      <p className="text-sm text-muted">
        Quelque chose s’est mal passé de notre côté. Réessayez dans un instant.
      </p>
      <div className="flex gap-2">
        <button onClick={reset} className="btn-primary">
          Réessayer
        </button>
        <Link href="/" className="btn-ghost">
          Accueil
        </Link>
      </div>
    </div>
  );
}
