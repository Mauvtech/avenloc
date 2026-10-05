'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveTokens } from '@/lib/auth';

function AuthCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError("Code d'échange manquant.");
      return;
    }
    api.auth
      .exchange(code)
      .then((tokens) => {
        saveTokens(tokens.accessToken, tokens.refreshToken);
        router.replace('/');
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Échec de la connexion Google');
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-danger-fg">{error}</p>
        <a href="/auth/login" className="font-semibold">
          Retour à la connexion
        </a>
      </div>
    );
  }

  return (
    <div className="py-16 text-center text-muted">
      <p>Connexion en cours…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted">Connexion en cours…</div>}>
      <AuthCallback />
    </Suspense>
  );
}
