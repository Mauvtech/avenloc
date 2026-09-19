'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, type PaymentHistoryItem, type ConnectStatus } from '@/lib/api';
import { EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { dateShort, eur } from '@/lib/format';
import { useHostGuard } from '../use-host-guard';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  CAPTURED: 'Encaissé',
  REFUNDED: 'Remboursé',
  PARTIALLY_REFUNDED: 'Partiellement remboursé',
  FAILED: 'Échoué',
};

export default function HostFinancesPage() {
  const { ready } = useHostGuard();
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    Promise.all([
      api.payments.hostHistory().catch(() => [] as PaymentHistoryItem[]),
      api.payments.connectStatus().catch(() => null),
    ])
      .then(([h, c]) => {
        setHistory(h);
        setConnect(c);
      })
      .finally(() => setLoading(false));
  }, [ready]);

  if (!ready || loading) return <PageLoader />;

  const totalNet = history
    .filter((p) => p.status === 'CAPTURED')
    .reduce((sum, p) => sum + Number(p.hostPayout), 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Finances" />

      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs text-muted">Encaissements</p>
          <p className="text-sm font-semibold">
            {connect?.connected && connect.status === 'active'
              ? `Actifs — IBAN •••• ${connect.last4 ?? ''}`
              : 'Non configurés'}
          </p>
        </div>
        <Link href="/host" className="btn-ghost">
          Gérer sur le tableau de bord
        </Link>
      </div>

      <div className="card p-4">
        <p className="text-xs text-muted">Total net reversé</p>
        <p className="text-2xl font-extrabold tracking-tight">{eur(totalNet)}</p>
      </div>

      {history.length === 0 ? (
        <EmptyState icon="💳" title="Aucun encaissement pour l'instant">
          L&apos;historique de vos versements apparaîtra ici après vos premières réservations payées.
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {history.map((p) => (
            <div key={p.id} className="card flex items-center justify-between gap-3 p-3.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.booking.listing.title}</p>
                <p className="text-xs text-muted">
                  {p.booking.tenant.firstName} {p.booking.tenant.lastName} ·{' '}
                  {p.capturedAt ? dateShort(p.capturedAt) : dateShort(p.createdAt)}
                </p>
              </div>
              <div className="flex-none text-right">
                <p className="font-extrabold tabular-nums">{eur(p.hostPayout)}</p>
                <p className="text-[11px] text-muted">{STATUS_LABEL[p.status] ?? p.status}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
