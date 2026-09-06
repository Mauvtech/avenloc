'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import ListingPhotos from '@/components/listing-photos';
import { useToast } from '@/components/toast';
import { CANCELLATION_LABEL, CANCELLATION_POLICIES, typeLabel } from '@/lib/listing';
import type { Listing } from '@/lib/types';

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    basePrice: '',
    cleaningFee: '',
    maxGuests: '',
    cancellationPolicy: 'MODERATE',
    instantBookEnabled: false,
    amenities: '',
  });

  function hydrate(l: Listing) {
    setListing(l);
    setForm({
      title: l.title,
      description: l.description,
      basePrice: String(l.basePrice ?? ''),
      cleaningFee: l.cleaningFee != null ? String(l.cleaningFee) : '',
      maxGuests: l.maxGuests != null ? String(l.maxGuests) : '',
      cancellationPolicy: l.cancellationPolicy,
      instantBookEnabled: l.instantBookEnabled,
      amenities: l.amenities.join(', '),
    });
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    Promise.all([api.auth.me(), api.listings.getById(id)])
      .then(([me, l]) => {
        if (l.hostId !== me.id) return router.replace('/host');
        hydrate(l);
      })
      .catch(() => router.replace('/host'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.listings.update(id, {
        title: form.title,
        description: form.description,
        basePrice: parseFloat(form.basePrice),
        cleaningFee: form.cleaningFee ? parseFloat(form.cleaningFee) : undefined,
        maxGuests: form.maxGuests ? parseInt(form.maxGuests, 10) : undefined,
        cancellationPolicy: form.cancellationPolicy,
        instantBookEnabled: form.instantBookEnabled,
        amenities: form.amenities.split(',').map((a) => a.trim()).filter(Boolean),
      });
      hydrate(updated);
      toast.success('Annonce mise à jour');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="py-16 text-center text-muted">Chargement…</p>;
  if (!listing) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href="/host" className="text-sm text-muted hover:text-ink">
          ← Mes annonces
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold">Modifier l&apos;annonce</h1>
        <p className="text-sm text-muted">{typeLabel(listing.type)}</p>
      </div>

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
        <div className="grid gap-3 sm:grid-cols-3">
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

      {/* Photos */}
      <div className="card space-y-4 p-5">
        <h2 className="section-title">Photos</h2>
        <ListingPhotos listingId={listing.id} initialPhotos={listing.photos} />
      </div>
    </div>
  );
}
