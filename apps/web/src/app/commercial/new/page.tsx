'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import SpaceWizard from '@/components/space-wizard';
import { PageLoader } from '@/components/ui';
import { api } from '@/lib/api';
import { queueLead } from '@/lib/commercial-queue';
import { leadPayload, saveAttachments, type SpaceDraft, type AttachmentProgress } from '@/lib/space-draft';
import type { CreateLeadResult } from '@/lib/types';
import { useCommercialGuard } from '../use-commercial-guard';

export default function NewCommercialLeadPage() {
  const { ready } = useCommercialGuard();
  const result = useRef<CreateLeadResult | null>(null);
  const progress = useRef<AttachmentProgress>({ photos: {}, faq: {} });
  const [confirmation, setConfirmation] = useState<{ form: SpaceDraft; queued: boolean } | null>(null);

  async function submit(form: SpaceDraft) {
    const payload = leadPayload(form);
    try {
      if (!result.current) result.current = await api.commercial.createLead(payload);
      else await api.listings.update(result.current.listing.id, payload.listing);
      await saveAttachments(result.current.listing.id, form, progress.current);
      setConfirmation({ form, queued: false });
    } catch (error) {
      if (!navigator.onLine || error instanceof TypeError) {
        await queueLead(payload, form, result.current?.listing.id, progress.current);
        setConfirmation({ form, queued: true });
      } else throw error;
    }
  }

  if (!ready) return <PageLoader />;
  if (!confirmation) return <div className="-mx-4 -my-6 min-[641px]:-m-8"><SpaceWizard context="commercial" onSubmit={submit} /></div>;
  const { form, queued } = confirmation;
  return (
    <div className="mx-auto my-[60px] max-w-[480px] p-8 text-center">
      <div className="mb-4 inline-block rounded-full bg-brand-tint px-3 py-[5px] text-xs font-semibold text-brand">{queued ? 'Fiche enregistrée sur cet appareil' : 'Fiche envoyée'}</div>
      <h1 className="mb-2.5 text-xl font-bold">{queued ? 'En attente de connexion' : `Envoyée à ${form.hostName || "l'hôte"} pour validation`}</h1>
      <p className="mb-6 text-[13px] text-muted">
        Établissement : {result.current?.establishment.name || form.nouvelEtablissement}<br />
        {queued ? "La fiche, les photos et la FAQ seront synchronisées au retour du réseau." : "L'hôte pourra publier la fiche après vérification depuis son espace."}
      </p>
      <div className={`mb-5 rounded px-3.5 py-2.5 text-xs ${queued ? 'bg-warn-tint text-warn-fg' : 'bg-success-tint text-success-fg'}`}>
        {queued ? "Pas de connexion au moment de l'envoi. Rouvrez l'espace Commercial dès que vous retrouvez du réseau. Ne videz pas les données de ce navigateur avant." : "✓ Fiche synchronisée en ligne, récupérable depuis n'importe quel appareil."}
      </div>
      {!queued && result.current?.invitation.token && <div className="card mb-5 p-[18px] text-left text-[13px]">
        <p className="mb-2 text-muted">Lien de validation à transmettre à l&apos;hôte :</p>
        <Link className="break-all text-brand underline" href={`/invitation/${result.current.invitation.token}`}>Ouvrir la fiche et activer le compte</Link>
      </div>}
      <button type="button" onClick={() => { result.current = null; progress.current = { photos: {}, faq: {} }; setConfirmation(null); }} className="rounded bg-ink px-5 py-[11px] text-[13px] font-semibold text-white">Créer une autre fiche</button>
    </div>
  );
}
