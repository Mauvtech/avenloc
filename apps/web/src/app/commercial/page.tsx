'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { EmptyState, PageHeader, PageLoader } from '@/components/ui';
import { dateShort } from '@/lib/format';
import { flushPendingLeads, listPendingLeads, type PendingLead } from '@/lib/commercial-queue';
import { useCommercialGuard } from './use-commercial-guard';
import type { HostInvitation } from '@/lib/types';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  SENT: { label: 'Envoyée', cls: 'bg-warn-tint text-warn-fg' },
  ACCEPTED: { label: 'Compte activé', cls: 'bg-success-tint text-success-fg' },
  EXPIRED: { label: 'Expirée', cls: 'bg-canvas text-muted' },
};

export default function CommercialDashboardPage() {
  const { ready } = useCommercialGuard();
  const [invitations, setInvitations] = useState<HostInvitation[]>([]);
  const [pending, setPending] = useState<PendingLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  function load() {
    api.commercial
      .history()
      .then(setInvitations)
      .catch(() => setInvitations([]));
    setPending(listPendingLeads());
  }

  useEffect(() => {
    if (!ready) return;
    load();
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Resynchronisation automatique des fiches créées hors-ligne dès que le
  // réseau revient, sans action de l'utilisateur.
  useEffect(() => {
    const onOnline = () => flushPendingLeads().then(load);
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  async function sync() {
    setSyncing(true);
    await flushPendingLeads();
    load();
    setSyncing(false);
  }

  if (!ready || loading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Espace commercial"
        action={
          <div className="flex gap-2">
            <Link href="/commercial/moderation" className="btn-ghost">
              Modération
            </Link>
            <Link href="/commercial/new" className="btn-primary">
              + Nouvelle fiche
            </Link>
          </div>
        }
      />

      {pending.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warn/30 bg-warn-tint px-4 py-3 text-sm">
          <span className="font-semibold text-warn-fg">
            {pending.length} fiche(s) en attente d&apos;envoi (créées hors-ligne)
          </span>
          <button onClick={sync} disabled={syncing} className="ml-auto btn-primary btn-sm">
            {syncing ? 'Synchronisation…' : 'Synchroniser maintenant'}
          </button>
        </div>
      )}

      {invitations.length === 0 ? (
        <EmptyState title="Aucune fiche pour l'instant">
          Créez une fiche lors d&apos;une visite terrain pour inviter un hôte à activer son compte.
        </EmptyState>
      ) : (
        <div className="space-y-2.5">
          {invitations.slice(0, 10).map((inv) => (
            <div key={inv.id} className="card flex flex-wrap items-center gap-3 p-3.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{inv.establishment?.name ?? 'Établissement'}</p>
                <p className="text-xs text-muted">
                  {inv.hostFirstName} {inv.hostLastName} · {inv.hostEmail} · {dateShort(inv.createdAt)}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_LABEL[inv.status]?.cls ?? 'bg-canvas text-muted'}`}>
                {STATUS_LABEL[inv.status]?.label ?? inv.status}
              </span>
            </div>
          ))}
          <Link href="/commercial/history" className="block pt-1 text-sm font-semibold text-brand-fg hover:underline">
            Voir tout l&apos;historique →
          </Link>
        </div>
      )}
    </div>
  );
}
