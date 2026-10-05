'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { dateShort } from '@/lib/format';
import { useCommercialGuard } from '../use-commercial-guard';
import type { HostInvitation } from '@/lib/types';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  SENT: { label: 'Envoyée', cls: 'bg-warn-tint text-warn-fg' },
  ACCEPTED: { label: 'Compte activé', cls: 'bg-success-tint text-success-fg' },
  EXPIRED: { label: 'Expirée', cls: 'bg-canvas text-muted' },
};

export default function CommercialHistoryPage() {
  const { ready } = useCommercialGuard();
  const [invitations, setInvitations] = useState<HostInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!ready) return;
    api.commercial
      .history()
      .then(setInvitations)
      .catch(() => setInvitations([]))
      .finally(() => setLoading(false));
  }, [ready]);

  async function exportZip() {
    setExporting(true);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      zip.file(
        'fiches.json',
        JSON.stringify(
          invitations.map((inv) => ({
            etablissement: inv.establishment?.name,
            adresse: inv.establishment?.addressLine1,
            ville: inv.establishment?.city,
            hote: `${inv.hostFirstName ?? ''} ${inv.hostLastName ?? ''}`.trim(),
            email: inv.hostEmail,
            telephone: inv.hostPhone,
            espace: inv.listing?.title,
            statut: inv.status,
            creee_le: inv.createdAt,
          })),
          null,
          2,
        ),
      );
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fiches-commercial-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (!ready || loading) return <PageLoader />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Historique"
        action={
          invitations.length > 0 ? (
            <button onClick={exportZip} disabled={exporting} className="btn-ghost">
              {exporting ? 'Export…' : '⬇ Exporter (.zip)'}
            </button>
          ) : undefined
        }
      />

      {invitations.length === 0 ? (
        <EmptyState title="Aucune fiche pour l'instant" />
      ) : (
        <div className="space-y-2.5">
          {invitations.map((inv) => (
            <div key={inv.id} className="card flex flex-wrap items-center gap-3 p-3.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{inv.establishment?.name ?? 'Établissement'}</p>
                <p className="text-xs text-muted">
                  {inv.listing?.title ? `${inv.listing.title} · ` : ''}
                  {inv.hostFirstName} {inv.hostLastName} · {inv.hostEmail} · {dateShort(inv.createdAt)}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  STATUS_LABEL[inv.status]?.cls ?? 'bg-canvas text-muted'
                }`}
              >
                {STATUS_LABEL[inv.status]?.label ?? inv.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
