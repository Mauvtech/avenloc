'use client';

import { useEffect, useState } from 'react';
import { api, type PaymentHistoryItem, type ConnectStatus } from '@/lib/api';
import { EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { downloadInvoice } from '@/lib/invoice';
import { useToast } from '@/components/toast';
import { dateShort, eur } from '@/lib/format';
import { useHostGuard } from '../use-host-guard';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  CAPTURED: 'Reversé',
  REFUNDED: 'Remboursé',
  PARTIALLY_REFUNDED: 'Partiellement remboursé',
  FAILED: 'Échoué',
};

export default function HostFinancesPage() {
  const { ready } = useHostGuard();
  const toast = useToast();
  const [history, setHistory] = useState<PaymentHistoryItem[]>([]);
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState(false);

  async function managePayments() {
    setOnboarding(true);
    try { window.location.href = (await api.payments.onboard()).url; }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Configuration indisponible'); setOnboarding(false); }
  }

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

  async function handleInvoice(payment: PaymentHistoryItem) {
    setDownloadingId(payment.id);
    try {
      const booking = await api.bookings.getById(payment.booking.id);
      downloadInvoice(payment, booking, connect?.holderName ?? undefined);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Impossible de générer la facture');
    } finally {
      setDownloadingId(null);
    }
  }

  if (!ready || loading) return <PageLoader />;

  const captured = history.filter((p) => p.status === 'CAPTURED');
  const totalNet = captured.reduce((sum, p) => sum + Number(p.hostPayout), 0);

  return (
    <div>
      <PageHeader title="Finances" />

      <div className="mb-8 mt-5 flex flex-wrap gap-4">
        <div className="flex-1 rounded-md border border-line p-[18px]">
          <div className="text-[13px] text-muted">Revenu net</div>
          <div className="mt-1.5 text-[22px] font-bold">{eur(totalNet)}</div>
        </div>
        <div className="flex-1 rounded-md border border-line p-[18px]">
          <div className="text-[13px] text-muted">Réservations</div>
          <div className="mt-1.5 text-[22px] font-bold">{captured.length}</div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-4">
        <div>
          <p className="text-xs text-muted">Encaissements</p>
          <p className="text-sm font-semibold">
            {connect?.connected && connect.status === 'active'
              ? `Actifs — IBAN •••• ${connect.last4 ?? ''}`
              : 'Non configurés'}
          </p>
        </div>
        <button type="button" onClick={managePayments} disabled={onboarding} className="btn-ghost">
          {onboarding ? 'Redirection…' : connect?.status === 'active' ? 'Gérer mes encaissements' : 'Configurer mes encaissements'}
        </button>
      </div>

      <p className="section-title mb-3">Historique des reversements</p>

      {history.length === 0 ? (
        <EmptyState title="Aucun encaissement pour l'instant">
          L&apos;historique de vos versements apparaîtra ici après vos premières réservations payées.
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line">
          {history.map((p, i) => (
            <div
              key={p.id}
              className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-[18px] py-3.5 text-[13px] ${i > 0 ? 'border-t border-line' : ''}`}
            >
              <div className="min-w-[110px] text-muted">
                {p.capturedAt ? dateShort(p.capturedAt) : dateShort(p.createdAt)}
              </div>
              <div className="min-w-0 flex-1 truncate font-medium">
                {p.booking.listing.title}
                <span className="font-normal text-muted">
                  {' '}
                  · {p.booking.tenant.firstName} {p.booking.tenant.lastName}
                </span>
              </div>
              <div className="font-medium">{eur(p.hostPayout)}</div>
              <div className="w-32 text-muted">{STATUS_LABEL[p.status] ?? p.status}</div>
              <button
                onClick={() => handleInvoice(p)}
                disabled={downloadingId === p.id}
                className="ml-auto bg-transparent text-[13px] font-semibold text-brand-fg hover:underline disabled:opacity-50"
              >
                {downloadingId === p.id ? 'Génération…' : 'Télécharger la facture'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
