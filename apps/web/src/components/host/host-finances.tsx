'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { computeHostStats, fmtEUR, netAmount } from '@/lib/host-stats';
import type { Booking } from '@/lib/types';

const EARNED = new Set(['CONFIRMED', 'COMPLETED']);

// Finances hôte — voir HostFinances dans le design de référence. Pas
// d'historique de reversement Stripe interrogeable directement : on calcule un
// équivalent réel (pas mocké) à partir des réservations encaissées, regroupées
// par mois.
export default function HostFinances() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    api.bookings
      .asHost()
      .then(setBookings)
      .catch(() => setBookings([]));
  }, []);

  if (bookings === null) {
    return <p className="py-6 text-center text-sm text-muted">Chargement…</p>;
  }

  const stats = computeHostStats(bookings);

  const byMonth = new Map<string, number>();
  for (const b of bookings) {
    if (!EARNED.has(b.status)) continue;
    const d = new Date(b.startDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    byMonth.set(key, (byMonth.get(key) ?? 0) + netAmount(b));
  }
  const rows = [...byMonth.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, amount]) => {
      const [y, m] = key.split('-').map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
      return { key, label, amount };
    });

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Kpi label="Revenu net du mois" value={fmtEUR(stats.revenueMonth)} />
        <Kpi label="Réservations" value={String(stats.bookingsMonth)} />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-bold">Historique des reversements</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">Aucun reversement pour le moment.</p>
        ) : (
          <div className="card overflow-hidden">
            {rows.map((r, i) => (
              <div
                key={r.key}
                className={`flex items-center px-4 py-3.5 text-[13px] ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <span className="flex-1 text-muted">{r.label}</span>
                <span className="flex-1 font-medium text-ink">{fmtEUR(r.amount)}</span>
                <span className="flex-1 text-muted">Reversé</span>
                <button type="button" className="flex-1 text-left font-semibold text-brand-fg hover:underline">
                  Télécharger la facture
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[160px] rounded-lg border border-line bg-surface p-4 shadow-card">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-xl font-extrabold tracking-tight">{value}</div>
    </div>
  );
}
