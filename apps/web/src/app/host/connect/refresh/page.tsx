'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated, loginHref } from '@/lib/auth';

// Stripe renvoie ici si le lien d'onboarding a expiré : on en régénère un.
export default function ConnectRefreshPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(loginHref(pathname));
      return;
    }
    api.payments
      .onboard()
      .then(({ url }) => {
        window.location.href = url;
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Lien indisponible.'),
      );
  }, [router]);

  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      {error ? (
        <>
          <p className="text-sm text-danger-fg">{error}</p>
          <Link href="/host" className="btn-primary inline-flex">
            Retour à mes annonces
          </Link>
        </>
      ) : (
        <p className="text-muted">Redirection vers Stripe…</p>
      )}
    </div>
  );
}
