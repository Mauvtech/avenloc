'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import SpaceWizard from '@/components/space-wizard';
import { PageLoader } from '@/components/ui';
import { useToast } from '@/components/toast';
import { api } from '@/lib/api';
import { listingPayload, saveAttachments, type SpaceDraft, type AttachmentProgress } from '@/lib/space-draft';
import { useHostGuard } from '@/app/host/use-host-guard';

export default function NewListingPage() {
  const { ready } = useHostGuard();
  const router = useRouter();
  const toast = useToast();
  const listingId = useRef<string | null>(null);
  const progress = useRef<AttachmentProgress>({ photos: {}, faq: {} });

  async function submit(form: SpaceDraft) {
    const payload = listingPayload(form);
    if (!listingId.current) listingId.current = (await api.listings.create(payload)).id;
    else await api.listings.update(listingId.current, payload);
    await saveAttachments(listingId.current, form, progress.current);
    await api.listings.setStatus(listingId.current, 'PUBLISHED');
    toast.success('Espace publié');
    router.push(`/host/spaces?created=${listingId.current}`);
  }

  return ready ? <div className="-mx-4 -my-6 min-[641px]:-m-8"><SpaceWizard context="host" onSubmit={submit} /></div> : <PageLoader />;
}
