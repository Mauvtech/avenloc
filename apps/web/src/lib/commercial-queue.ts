import { api } from './api';
import { saveAttachments, type SpaceDraft, type AttachmentProgress } from './space-draft';

const KEY = 'aven:commercial:pending';
interface SavedPhoto { id: string; dataUrl: string; name: string; type: string; }
export interface PendingLead {
  id: string;
  payload: unknown;
  createdAt: string;
  listingId?: string;
  photos?: SavedPhoto[];
  faq?: SpaceDraft['faq'];
  progress?: AttachmentProgress;
}

function readQueue(): PendingLead[] {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) as PendingLead[] : [];
}
function writeQueue(items: PendingLead[]) {
  // Ne jamais annoncer une sauvegarde réussie si le navigateur la refuse.
  localStorage.setItem(KEY, JSON.stringify(items));
}
export function listPendingLeads(): PendingLead[] {
  try { return readQueue(); } catch { return []; }
}
function serializePhoto(photo: SpaceDraft['photos'][number]): Promise<SavedPhoto> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de sauvegarder cette photo sur cet appareil.'));
    reader.onload = () => resolve({ id: photo.id, dataUrl: String(reader.result), name: photo.file.name, type: photo.file.type });
    reader.readAsDataURL(photo.file);
  });
}
export async function queueLead(payload: unknown, form?: SpaceDraft, listingId?: string, progress?: AttachmentProgress): Promise<void> {
  const photos = form ? await Promise.all(form.photos.map(serializePhoto)) : [];
  const items = readQueue();
  items.push({ id: `local-${crypto.randomUUID()}`, payload, createdAt: new Date().toISOString(), listingId, progress, photos, faq: form?.faq });
  try { writeQueue(items); } catch {
    throw new Error("L'espace de stockage de cet appareil est insuffisant. Gardez ce formulaire ouvert et réessayez dès que le réseau revient.");
  }
}
export function removePendingLead(id: string): void { writeQueue(readQueue().filter((item) => item.id !== id)); }
let flushing: Promise<number> | null = null;
export function flushPendingLeads(): Promise<number> {
  if (flushing) return flushing;
  flushing = flush().finally(() => { flushing = null; });
  return flushing;
}
async function flush(): Promise<number> {
  const items = listPendingLeads();
  let sent = 0;
  for (const item of items) {
    const persist = () => writeQueue(readQueue().map((entry) => entry.id === item.id ? item : entry));
    try {
      if (!item.listingId) {
        item.listingId = (await api.commercial.createLead(item.payload)).listing.id;
        persist();
      } else {
        await api.listings.update(item.listingId, (item.payload as { listing: Record<string, unknown> }).listing);
      }
      item.progress ??= { photos: {}, faq: {} };
      const photos = await Promise.all((item.photos ?? []).map(async (photo) => ({
        id: photo.id, url: photo.dataUrl,
        file: new File([await (await fetch(photo.dataUrl)).blob()], photo.name, { type: photo.type }),
      })));
      await saveAttachments(item.listingId, { photos, faq: item.faq ?? [] }, item.progress);
      removePendingLead(item.id);
      sent++;
    } catch {
      persist();
    }
  }
  return sent;
}
