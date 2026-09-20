import { api } from './api';
import { PROTOTYPE_TYPE_OPTIONS } from './listing';
import type { GeoResult } from './geo';

export interface DraftPhoto { id: string; url: string; file: File; }
export interface SpaceDraft {
  geo: GeoResult | null;
  etablissement: string; nouvelEtablissement: string;
  hostName: string; hostEmail: string; hostPhone: string;
  nom: string; type: string; adresse: string; capacite: string;
  superficie: string; prix: string; equipements: string[]; customTag: string;
  photos: DraftPhoto[]; titre: string; description: string; tags: string[];
  faq: { q: string; r: string }[];
  openDays: number[]; openStartTime: string; openEndTime: string;
  minDurationMinutes: number; minNoticeHours: number;
}

const AMENITIES: Record<string, string> = {
  'Wi-Fi': 'wifi', 'Écran': 'screen', 'Visioconférence': 'video-conference',
  'Café': 'coffee', 'Climatisation': 'ac', 'Parking': 'parking', 'Accessible PMR': 'wheelchair-access',
};

export function listingPayload(form: SpaceDraft) {
  if (!form.geo) throw new Error('Sélectionnez une adresse dans les suggestions.');
  return {
    type: PROTOTYPE_TYPE_OPTIONS.find((option) => option.label === form.type)?.value ?? 'MEETING_ROOM',
    title: form.titre.trim(), description: form.description.trim().replace(/[—–]/g, ', '),
    addressLine1: form.geo.addressLine1, city: form.geo.city, postalCode: form.geo.postalCode,
    country: 'FR', latitude: form.geo.latitude, longitude: form.geo.longitude,
    maxGuests: Number(form.capacite), basePrice: Number(form.prix.replace(',', '.')),
    pricingUnit: 'HOUR', cancellationPolicy: 'MODERATE', instantBookEnabled: false,
    amenities: form.equipements.map((item) => AMENITIES[item] ?? item),
    specificAttributes: { surface_m2: Number(form.superficie.replace(',', '.')), tags: form.tags },
    openDays: form.openDays, openStartTime: form.openStartTime, openEndTime: form.openEndTime,
    minDurationMinutes: form.minDurationMinutes, minNoticeHours: form.minNoticeHours,
  };
}

export function leadPayload(form: SpaceDraft) {
  const listing = listingPayload(form);
  const [firstName, ...lastName] = form.hostName.trim().split(/\s+/);
  return {
    host: { firstName, lastName: lastName.join(' '), email: form.hostEmail.trim(), phone: form.hostPhone.trim() || undefined },
    establishment: form.etablissement ? { existingId: form.etablissement } : {
      name: form.nouvelEtablissement.trim(), addressLine1: listing.addressLine1,
      city: listing.city, postalCode: listing.postalCode, country: 'FR',
      latitude: listing.latitude, longitude: listing.longitude,
    },
    listing,
  };
}

export interface AttachmentProgress {
  photos: Record<string, string>;
  faq: Record<string, string>;
}

/** Reprend un envoi partiel sans recréer la fiche ni les pièces déjà enregistrées. */
export async function saveAttachments(id: string, form: Pick<SpaceDraft, 'photos' | 'faq'>, progress: AttachmentProgress) {
  const photoIds = new Set(form.photos.map((photo) => photo.id));
  for (const [localId, serverId] of Object.entries(progress.photos)) {
    if (!photoIds.has(localId)) { await api.listings.deletePhoto(id, serverId); delete progress.photos[localId]; }
  }
  for (const photo of form.photos) {
    if (!progress.photos[photo.id]) progress.photos[photo.id] = (await api.listings.uploadPhoto(id, photo.file)).id;
  }
  const faqKeys = new Set(form.faq.map((item) => JSON.stringify(item)));
  for (const [key, serverId] of Object.entries(progress.faq)) {
    if (!faqKeys.has(key)) { await api.listings.deleteFaqItem(id, serverId); delete progress.faq[key]; }
  }
  for (const item of form.faq) {
    const key = JSON.stringify(item);
    if (!progress.faq[key]) progress.faq[key] = (await api.listings.addFaqItem(id, { question: item.q.trim(), answer: item.r.trim() })).id;
  }
}
