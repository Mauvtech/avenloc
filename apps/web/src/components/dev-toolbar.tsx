'use client';

import { useEffect, useState } from 'react';
import { api, type FeatureFlags } from '@/lib/api';

const LABELS: Record<keyof FeatureFlags, string> = {
  simulatePayments: 'Simuler les paiements',
};

export default function DevToolbar() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.features
      .get()
      .then((r) => {
        setEnabled(r.adminEnabled);
        setFlags(r.flags);
      })
      .catch(() => setEnabled(false));
  }, []);

  if (!enabled || !flags) return null;

  const anyOn = Object.values(flags).some(Boolean);

  async function toggle(key: keyof FeatureFlags) {
    if (!flags) return;
    setBusy(true);
    try {
      const r = await api.features.set({ [key]: !flags[key] } as Partial<FeatureFlags>);
      setFlags(r.flags);
      // Recharge pour propager le flag partout (server components, pages hôte/annonce).
      window.location.reload();
    } catch {
      setBusy(false);
    }
  }

  return (
    // Remonté sur mobile pour ne pas passer sous la barre d'action des fiches annonce.
    <div className="fixed bottom-20 left-3 z-[120] font-sans text-sm md:bottom-3">
      {open ? (
        <div className="w-64 rounded-lg border border-line bg-surface p-3 shadow-modal">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-muted">
              Mode démo
            </span>
            <button onClick={() => setOpen(false)} className="text-muted hover:text-ink" aria-label="Fermer">
              ✕
            </button>
          </div>
          <div className="space-y-1.5">
            {(Object.keys(flags) as (keyof FeatureFlags)[]).map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-2 rounded px-1.5 py-1 hover:bg-canvas"
              >
                <span>{LABELS[key] ?? key}</span>
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={flags[key]}
                  onChange={() => toggle(key)}
                  className="accent-brand"
                />
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-tight text-muted">
            Contourne les briques externes pour dérouler tous les parcours. À désactiver en prod
            (`FEATURES_ADMIN=false`).
          </p>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-card ${
            anyOn
              ? 'border-warn/40 bg-warn-tint text-warn-fg'
              : 'border-line bg-surface text-muted'
          }`}
        >
          ⚙︎ Démo{anyOn ? ' · actif' : ''}
        </button>
      )}
    </div>
  );
}
