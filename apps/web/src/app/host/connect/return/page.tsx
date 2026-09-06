'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

export default function ConnectReturnPage() {
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'active' | 'incomplete' | 'error'>('checking');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    api.payments
      .connectStatus()
      .then((s) => setState(s.connected && s.status === 'active' ? 'active' : 'incomplete'))
      .catch(() => setState('error'));
  }, [router]);

  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      {state === 'checking' && <p className="text-muted">Vérification de votre compte…</p>}

      {state === 'active' && (
        <>
          <div className="text-2xl">✅</div>
          <h1 className="text-xl font-extrabold">Versements activés</h1>
          <p className="text-sm text-muted">
            Vos coordonnées ont été enregistrées par Stripe. Vos annonces peuvent recevoir des
            réservations payées.
          </p>
        </>
      )}

      {state === 'incomplete' && (
        <>
          <div className="text-2xl">⏳</div>
          <h1 className="text-xl font-extrabold">Presque terminé</h1>
          <p className="text-sm text-muted">
            Stripe n&apos;a pas encore validé toutes vos informations. Vous pourrez reprendre depuis
            « Mes annonces ».
          </p>
        </>
      )}

      {state === 'error' && (
        <>
          <div className="text-2xl">⚠️</div>
          <h1 className="text-xl font-extrabold">Impossible de vérifier</h1>
          <p className="text-sm text-muted">Réessayez depuis votre tableau de bord.</p>
        </>
      )}

      <Link href="/host" className="btn-primary mt-2 inline-flex">
        Retour à mes annonces
      </Link>
    </div>
  );
}
