'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { canModerate, isAuthenticated, loginHref } from '@/lib/auth';
import ListingPhotos from '@/components/listing-photos';
import ListingFaqEditor from '@/components/listing-faq-editor';
import { useToast } from '@/components/toast';
import { useConfirm } from '@/components/confirm';
import { PageLoader } from '@/components/ui';
import {
  ACCESS_METHOD_LABEL,
  ACCESS_METHODS,
  CANCELLATION_LABEL,
  CANCELLATION_POLICIES,
  typeLabel,
  WEEKDAY_LABEL,
} from '@/lib/listing';
import type { Listing, ListingFaqItem } from '@/lib/types';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const confirm = useConfirm();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [moderating, setModerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    basePrice: '',
    cleaningFee: '',
    depositAmount: '',
    maxGuests: '',
    cancellationPolicy: 'MODERATE',
    instantBookEnabled: false,
    amenities: '',
    openStartTime: '08:00',
    openEndTime: '19:00',
    minDurationMinutes: '60',
    minNoticeHours: '0',
    accessMethod: '',
    accessInstructions: '',
    activityValidationRequired: false,
    rcProRequired: false,
    houseRules: '',
  });
  const [openDays, setOpenDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [faq, setFaq] = useState<ListingFaqItem[]>([]);

  function hydrate(l: Listing) {
    setListing(l);
    setForm({
      title: l.title,
      description: l.description,
      basePrice: String(l.basePrice ?? ''),
      cleaningFee: l.cleaningFee != null ? String(l.cleaningFee) : '',
      depositAmount: l.depositAmount != null ? String(l.depositAmount) : '',
      maxGuests: l.maxGuests != null ? String(l.maxGuests) : '',
      cancellationPolicy: l.cancellationPolicy,
      instantBookEnabled: l.instantBookEnabled,
      amenities: l.amenities.join(', '),
      openStartTime: l.openStartTime,
      openEndTime: l.openEndTime,
      minDurationMinutes: String(l.minDurationMinutes),
      minNoticeHours: String(l.minNoticeHours),
      accessMethod: l.accessMethod ?? '',
      accessInstructions: l.accessInstructions ?? '',
      activityValidationRequired: l.activityValidationRequired,
      rcProRequired: l.rcProRequired,
      houseRules: l.houseRules ?? '',
    });
    setOpenDays(l.openDays);
    setFaq(l.faqItems ?? []);
  }

  function toggleOpenDay(d: number) {
    setOpenDays((days) => (days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort()));
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(loginHref(pathname));
      return;
    }
    Promise.all([api.auth.me(), api.listings.getById(id)])
      .then(([me, l]) => {
        if (l.hostId !== me.id) {
          if (!canModerate(me)) return router.replace('/host/spaces');
          setModerating(true);
        }
        hydrate(l);
      })
      .catch(() => router.replace('/host/spaces'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleDeletePermanently() {
    if (!listing) return;
    const ok = await confirm({
      title: 'Supprimer définitivement cette annonce ?',
      body: "Action irréversible, réservée à la modération. Impossible si l'annonce a des réservations, messages ou une invitation liés — dans ce cas, archivez-la plutôt.",
      confirmLabel: 'Supprimer définitivement',
      danger: true,
    });
    if (!ok) return;
    setDeleting(true);
    try {
      await api.listings.deletePermanently(listing.id);
      toast.success('Annonce supprimée définitivement');
      router.push('/commercial/moderation');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Suppression impossible');
      setDeleting(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.listings.update(id, {
        title: form.title,
        description: form.description,
        basePrice: parseFloat(form.basePrice),
        cleaningFee: form.cleaningFee ? parseFloat(form.cleaningFee) : undefined,
        depositAmount: form.depositAmount ? parseFloat(form.depositAmount) : undefined,
        maxGuests: form.maxGuests ? parseInt(form.maxGuests, 10) : undefined,
        cancellationPolicy: form.cancellationPolicy,
        instantBookEnabled: form.instantBookEnabled,
        amenities: form.amenities.split(',').map((a) => a.trim()).filter(Boolean),
        openDays,
        openStartTime: form.openStartTime,
        openEndTime: form.openEndTime,
        minDurationMinutes: parseInt(form.minDurationMinutes, 10) || 60,
        minNoticeHours: parseInt(form.minNoticeHours, 10) || 0,
        accessMethod: form.accessMethod || undefined,
        accessInstructions: form.accessInstructions || undefined,
        activityValidationRequired: form.activityValidationRequired,
        rcProRequired: form.rcProRequired,
        houseRules: form.houseRules || undefined,
      });
      hydrate(updated);
      toast.success('Annonce mise à jour');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader />;
  if (!listing) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href={moderating ? '/commercial/moderation' : '/host/spaces'} className="text-sm text-muted hover:text-ink">
          {moderating ? '← Modération' : '← Mes annonces'}
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold">Modifier l&apos;annonce</h1>
        <p className="text-sm text-muted">{typeLabel(listing.type)}</p>
      </div>

      {moderating && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warn/30 bg-warn-tint px-4 py-3 text-sm">
          <span className="font-semibold text-warn-fg">Mode modération</span>
          <span className="text-muted">— vous modifiez l&apos;annonce d&apos;un autre hôte.</span>
          <button
            onClick={handleDeletePermanently}
            disabled={deleting}
            className="ml-auto text-sm font-semibold text-danger-fg hover:underline"
          >
            {deleting ? 'Suppression…' : 'Supprimer définitivement'}
          </button>
        </div>
      )}

      {/* Détails */}
      <form onSubmit={handleSave} className="card space-y-4 p-5">
        <h2 className="section-title">Détails</h2>
        <div>
          <label className="label">Titre</label>
          <input
            className="field"
            required
            minLength={5}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="field resize-y"
            rows={4}
            required
            minLength={20}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Prix / unité (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              className="field"
              value={form.basePrice}
              onChange={(e) => setForm((f) => ({ ...f, basePrice: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Frais de ménage (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="field"
              value={form.cleaningFee}
              onChange={(e) => setForm((f) => ({ ...f, cleaningFee: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Caution (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="field"
              value={form.depositAmount}
              onChange={(e) => setForm((f) => ({ ...f, depositAmount: e.target.value }))}
              placeholder="Aucune"
            />
          </div>
          <div>
            <label className="label">Locataires max</label>
            <input
              type="number"
              min="1"
              className="field"
              value={form.maxGuests}
              onChange={(e) => setForm((f) => ({ ...f, maxGuests: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="label">Politique d&apos;annulation</label>
          <select
            className="field"
            value={form.cancellationPolicy}
            onChange={(e) => setForm((f) => ({ ...f, cancellationPolicy: e.target.value }))}
          >
            {CANCELLATION_POLICIES.map((p) => (
              <option key={p} value={p}>
                {CANCELLATION_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">
            Équipements <span className="font-normal">(séparés par des virgules)</span>
          </label>
          <input
            className="field"
            value={form.amenities}
            onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
            placeholder="wifi, parking, cuisine"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="accent-brand"
            checked={form.instantBookEnabled}
            onChange={(e) => setForm((f) => ({ ...f, instantBookEnabled: e.target.checked }))}
          />
          Réservation instantanée
        </label>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      {/* Conditions */}
      <form onSubmit={handleSave} className="card space-y-4 p-5">
        <h2 className="section-title">Conditions & horaires</h2>
        <div>
          <span className="label">Jours d&apos;ouverture</span>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleOpenDay(d)}
                className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  openDays.includes(d)
                    ? 'border-ink bg-ink text-white'
                    : 'border-line bg-surface text-ink hover:border-ink/40'
                }`}
              >
                {WEEKDAY_LABEL[d]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Ouverture</label>
            <input
              type="time"
              className="field"
              value={form.openStartTime}
              onChange={(e) => setForm((f) => ({ ...f, openStartTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Fermeture</label>
            <input
              type="time"
              className="field"
              value={form.openEndTime}
              onChange={(e) => setForm((f) => ({ ...f, openEndTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Durée min. (min)</label>
            <input
              type="number"
              min="15"
              step="15"
              className="field"
              value={form.minDurationMinutes}
              onChange={(e) => setForm((f) => ({ ...f, minDurationMinutes: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Délai min. (h)</label>
            <input
              type="number"
              min="0"
              className="field"
              value={form.minNoticeHours}
              onChange={(e) => setForm((f) => ({ ...f, minNoticeHours: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Méthode d&apos;accès</label>
            <select
              className="field"
              value={form.accessMethod}
              onChange={(e) => setForm((f) => ({ ...f, accessMethod: e.target.value }))}
            >
              <option value="">Aucune / à définir</option>
              {ACCESS_METHODS.map((m) => (
                <option key={m} value={m}>
                  {ACCESS_METHOD_LABEL[m]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">
              Instructions d&apos;accès <span className="font-normal">(révélées après confirmation)</span>
            </label>
            <input
              type="text"
              className="field"
              value={form.accessInstructions}
              onChange={(e) => setForm((f) => ({ ...f, accessInstructions: e.target.value }))}
              placeholder="Ex. Code porte 4821A"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-brand"
              checked={form.activityValidationRequired}
              onChange={(e) => setForm((f) => ({ ...f, activityValidationRequired: e.target.checked }))}
            />
            Valider manuellement l&apos;activité prévue
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="accent-brand"
              checked={form.rcProRequired}
              onChange={(e) => setForm((f) => ({ ...f, rcProRequired: e.target.checked }))}
            />
            Exiger une attestation RC Pro
          </label>
        </div>
        <div>
          <label className="label">Règlement intérieur</label>
          <textarea
            rows={3}
            className="field resize-y"
            value={form.houseRules}
            onChange={(e) => setForm((f) => ({ ...f, houseRules: e.target.value }))}
          />
        </div>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      {/* FAQ */}
      <div className="card space-y-4 p-5">
        <h2 className="section-title">FAQ</h2>
        <ListingFaqEditor
          items={faq}
          onAdd={async (item) => {
            const created = await api.listings.addFaqItem(listing.id, item);
            setFaq((f) => [...f, created]);
          }}
          onRemove={async (item) => {
            if (item.id) await api.listings.deleteFaqItem(listing.id, item.id);
            setFaq((f) => f.filter((x) => x.id !== item.id));
          }}
        />
      </div>

      {/* Photos */}
      <div className="card space-y-4 p-5">
        <h2 className="section-title">Photos</h2>
        <ListingPhotos listingId={listing.id} initialPhotos={listing.photos} />
      </div>
    </div>
  );
}
