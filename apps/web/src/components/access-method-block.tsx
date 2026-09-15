'use client';

import { useState } from 'react';

interface Props {
  method: string;
  accessCode: string | null;
}

// Instructions d'accès affichées une fois le paiement confirmé — voir
// AccessMethodBlock / SerrureConnectee dans le design de référence.
export default function AccessMethodBlock({ method, accessCode }: Props) {
  if (method === 'QR') {
    return (
      <div className="card p-5 text-center">
        <p className="mb-3 text-sm text-muted">
          Scannez ce QR code à l&apos;arrivée pour déverrouiller l&apos;accès
        </p>
        <svg viewBox="0 0 120 120" className="mx-auto h-28 w-28">
          <rect width="120" height="120" fill="white" />
          {Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 8 }).map((_, c) => {
              const on = (r * 7 + c * 3 + r * c) % 3 === 0;
              return on ? (
                <rect key={`${r}-${c}`} x={c * 15} y={r * 15} width="15" height="15" fill="#14171A" />
              ) : null;
            }),
          )}
          <rect x="0" y="0" width="30" height="30" fill="none" stroke="#14171A" strokeWidth="4" />
          <rect x="90" y="0" width="30" height="30" fill="none" stroke="#14171A" strokeWidth="4" />
          <rect x="0" y="90" width="30" height="30" fill="none" stroke="#14171A" strokeWidth="4" />
        </svg>
        <p className="mt-2.5 text-xs text-muted">Le QR code reste actif pendant toute la durée du créneau.</p>
      </div>
    );
  }

  if (method === 'KEYBOX') {
    return (
      <div className="card p-5">
        <p className="mb-1 text-sm font-bold">Boîte à clés</p>
        <p className="mb-3.5 text-sm text-muted">
          Composez le code ci-dessous pour récupérer la clé.
        </p>
        <p className="text-center text-2xl font-extrabold tracking-[0.3em]">{accessCode || '—'}</p>
      </div>
    );
  }

  if (method === 'SMART_LOCK') {
    return <SmartLock />;
  }

  if (method === 'RECEPTION') {
    return (
      <div className="card p-5">
        <p className="mb-1 text-sm font-bold">Accès</p>
        <p className="text-sm text-muted">
          Présentez-vous à l&apos;accueil, votre réservation est enregistrée automatiquement à votre nom.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5 text-center">
      <p className="mb-2.5 text-sm text-muted">Code d&apos;accès temporaire</p>
      <p className="text-2xl font-extrabold tracking-[0.3em]">{accessCode || '—'}</p>
    </div>
  );
}

function SmartLock() {
  const [unlocked, setUnlocked] = useState(false);
  return (
    <div className="card p-5 text-center">
      <p className="mb-1 text-sm font-bold">Serrure connectée</p>
      <p className="mb-3.5 text-xs text-muted">
        Déverrouillage à distance disponible dès le début du créneau.
      </p>
      <button
        type="button"
        disabled={unlocked}
        onClick={() => setUnlocked(true)}
        className={unlocked ? 'rounded-md bg-success-tint px-5 py-2.5 text-sm font-semibold text-success-fg' : 'btn-primary'}
      >
        {unlocked ? 'Porte déverrouillée ✓' : 'Déverrouiller la porte'}
      </button>
    </div>
  );
}
