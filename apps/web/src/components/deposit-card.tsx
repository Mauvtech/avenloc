'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';
import { eur } from '@/lib/format';
import type { Deposit } from '@/lib/types';

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  AUTHORIZED: { label: 'Empreinte posée', cls: 'bg-canvas text-muted' },
  CAPTURE_REQUESTED: { label: 'Réclamation en cours', cls: 'bg-warn-tint text-warn-fg' },
  CAPTURED: { label: 'Capturée', cls: 'bg-danger-tint text-danger-fg' },
  CONTESTED: { label: 'Contestée — médiation', cls: 'bg-warn-tint text-warn-fg' },
  RELEASED: { label: 'Libérée', cls: 'bg-success-tint text-success-fg' },
  EXPIRED: { label: 'Expirée', cls: 'bg-danger-tint text-danger-fg' },
};

const REASONS = ['Dégradation', 'No-show', 'Retard', 'Dépassement de créneau', 'Autre'];

interface Props {
  bookingId: string;
  role: 'tenant' | 'host';
}

// N'affiche rien si l'annonce ne demandait pas de caution pour cette réservation.
export default function DepositCard({ bookingId, role }: Props) {
  const toast = useToast();
  const [deposit, setDeposit] = useState<Deposit | null | undefined>(undefined);
  const [claiming, setClaiming] = useState(false);
  const [form, setForm] = useState({ reason: REASONS[0], amount: '', description: '' });
  const [files, setFiles] = useState<File[]>([]);
  const [contesting, setContesting] = useState(false);
  const [contestReason, setContestReason] = useState('');
  const [busy, setBusy] = useState(false);

  function load() {
    api.deposits
      .get(bookingId)
      .then(setDeposit)
      .catch(() => setDeposit(null));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [bookingId]);

  if (!deposit) return null; // chargement, ou pas de caution requise

  const st = STATUS_LABEL[deposit.status] ?? { label: deposit.status, cls: 'bg-canvas text-muted' };

  async function submitClaim(e: React.FormEvent) {
    e.preventDefault();
    if (files.length === 0) {
      toast.error('Ajoutez au moins une photo justificative');
      return;
    }
    setBusy(true);
    try {
      await api.deposits.claim(bookingId, form, files);
      toast.success('Réclamation envoyée — le locataire a 48h pour répondre');
      setClaiming(false);
      setFiles([]);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la réclamation');
    } finally {
      setBusy(false);
    }
  }

  async function respond(decision: 'accept' | 'contest') {
    if (decision === 'contest' && !contestReason.trim()) {
      toast.error('Précisez le motif de contestation');
      return;
    }
    setBusy(true);
    try {
      await api.deposits.respond(bookingId, decision, contestReason || undefined);
      toast.success(decision === 'accept' ? 'Réclamation acceptée' : 'Contestation envoyée');
      setContesting(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Caution</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
      </div>

      <p className="text-sm text-muted">
        Empreinte de {eur(deposit.amount)}, jamais débitée sauf réclamation justifiée de l&apos;hôte.
      </p>

      {deposit.status === 'CAPTURE_REQUESTED' && (
        <div className="space-y-2 rounded-md bg-warn-tint p-3 text-sm text-warn-fg">
          <p className="font-semibold">
            Réclamation de {eur(deposit.capturedAmount ?? deposit.amount)} — {deposit.captureReason}
          </p>
          {deposit.proofUrls.length > 0 && (
            <div className="flex gap-2">
              {deposit.proofUrls.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={u} src={u} alt="Preuve" className="h-16 w-16 rounded object-cover" />
              ))}
            </div>
          )}
          {role === 'tenant' && !contesting && (
            <div className="flex gap-2 pt-1">
              <button onClick={() => respond('accept')} disabled={busy} className="btn-primary btn-sm">
                Accepter
              </button>
              <button onClick={() => setContesting(true)} className="btn-ghost btn-sm">
                Contester
              </button>
            </div>
          )}
          {role === 'tenant' && contesting && (
            <div className="space-y-2 pt-1">
              <textarea
                value={contestReason}
                onChange={(e) => setContestReason(e.target.value)}
                rows={2}
                className="field resize-y"
                placeholder="Motif de contestation"
              />
              <div className="flex gap-2">
                <button onClick={() => respond('contest')} disabled={busy} className="btn-danger btn-sm">
                  Envoyer la contestation
                </button>
                <button onClick={() => setContesting(false)} className="btn-ghost btn-sm">
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {deposit.status === 'CAPTURED' && (
        <p className="text-sm text-danger-fg">
          {eur(deposit.capturedAmount ?? deposit.amount)} capturés — {deposit.captureReason}
        </p>
      )}
      {deposit.status === 'CONTESTED' && (
        <p className="text-sm text-warn-fg">
          Contestée : « {deposit.contestReason} ». En attente de médiation Aven.
        </p>
      )}
      {deposit.status === 'RELEASED' && (
        <p className="text-sm text-success-fg">Caution libérée, aucun montant prélevé.</p>
      )}

      {role === 'host' && deposit.status === 'AUTHORIZED' && (
        <>
          {!claiming ? (
            <button onClick={() => setClaiming(true)} className="btn-ghost btn-sm">
              Demander une capture de caution
            </button>
          ) : (
            <form onSubmit={submitClaim} className="space-y-2 rounded-md border border-line p-3">
              <div>
                <label className="label">Motif</label>
                <select
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  className="field"
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Montant demandé (max {eur(deposit.amount)})</label>
                <input
                  type="number"
                  min="0.01"
                  max={deposit.amount}
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="field"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  required
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="field resize-y"
                  placeholder="Décrivez précisément ce qui justifie cette demande…"
                />
              </div>
              <div>
                <label className="label">Photos justificatives (au moins 1)</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))}
                  className="field"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="btn-primary btn-sm">
                  Envoyer la réclamation
                </button>
                <button type="button" onClick={() => setClaiming(false)} className="btn-ghost btn-sm">
                  Annuler
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
