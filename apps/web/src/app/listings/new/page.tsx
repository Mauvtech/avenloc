'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import CategoryIcon from '@/components/category-icon';
import AddressAutocomplete from '@/components/address-autocomplete';
import type { GeoResult } from '@/lib/geo';
import {
  CANCELLATION_LABEL,
  CANCELLATION_POLICIES,
  LISTING_TYPES,
  PRICING_UNITS,
  UNIT_LABEL_SHORT,
  typeLabel,
} from '@/lib/listing';

export default function NewListingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    type: 'APARTMENT',
    title: '',
    description: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    country: 'FR',
    latitude: '',
    longitude: '',
    maxGuests: '',
    pricingUnit: 'NIGHT',
    basePrice: '',
    cleaningFee: '',
    cancellationPolicy: 'MODERATE',
    instantBookEnabled: false,
    amenities: '',
  });

  // Recherche d'adresse (géocodée via la Base Adresse Nationale)
  const [addressQuery, setAddressQuery] = useState('');
  const [geo, setGeo] = useState<GeoResult | null>(null);

  // Photos à téléverser après création de l'annonce
  const [photos, setPhotos] = useState<File[]>([]);
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function onAddressSelect(r: GeoResult) {
    setGeo(r);
    setForm((f) => ({
      ...f,
      // Pré-remplit le champ "numéro et rue" — l'hôte peut le compléter/corriger,
      // notamment quand la BAN ne connaît pas le numéro de la voie.
      addressLine1: r.addressLine1 || r.label,
      city: r.city,
      postalCode: r.postalCode,
      country: 'FR',
      latitude: String(r.latitude),
      longitude: String(r.longitude),
    }));
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setPhotos((prev) => [...prev, ...imgs].slice(0, 12));
  }

  function onAddressQueryChange(text: string) {
    setAddressQuery(text);
    if (geo) setGeo(null); // l'adresse validée n'est plus à jour
  }

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/auth/login');
  }, [router]);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value =
        e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!geo || !form.latitude || !form.longitude) {
      setError('Sélectionnez une adresse dans la liste des suggestions.');
      return;
    }
    if (!form.addressLine1.trim()) {
      setError('Indiquez le numéro et le nom de la rue.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        type: form.type,
        title: form.title,
        description: form.description,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || undefined,
        city: form.city,
        postalCode: form.postalCode,
        country: form.country,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        maxGuests: form.maxGuests ? parseInt(form.maxGuests, 10) : undefined,
        pricingUnit: form.pricingUnit,
        basePrice: parseFloat(form.basePrice),
        cleaningFee: form.cleaningFee ? parseFloat(form.cleaningFee) : undefined,
        cancellationPolicy: form.cancellationPolicy,
        instantBookEnabled: form.instantBookEnabled,
        amenities: form.amenities
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      };
      const listing = await api.listings.create(payload);

      // Téléversement des photos (échec d'une photo = non bloquant).
      for (const file of photos) {
        try {
          await api.listings.uploadPhoto(listing.id, file);
        } catch {
          /* ignore : l'hôte pourra réessayer depuis « Photos » */
        }
      }

      router.push('/host');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <button onClick={() => router.back()} className="text-sm text-muted hover:text-ink">
        ← Annuler
      </button>
      <h1 className="text-2xl font-extrabold">Nouvelle annonce</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 1. Type */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold">1. Type de local</h2>
          <div className="-mx-1 flex flex-wrap gap-2 px-1">
            {LISTING_TYPES.map((t) => {
              const active = form.type === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    active ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:text-ink'
                  }`}
                >
                  <CategoryIcon type={t} size={16} />
                  {typeLabel(t)}
                </button>
              );
            })}
          </div>
        </section>

        {/* 2. Informations générales */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold">2. Informations générales</h2>
          <div>
            <label className="label">Titre de l&apos;annonce</label>
            <input type="text" required minLength={5} value={form.title} onChange={set('title')} className="field" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              required
              minLength={20}
              rows={4}
              value={form.description}
              onChange={set('description')}
              className="field resize-y"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Unité de prix</label>
              <select value={form.pricingUnit} onChange={set('pricingUnit')} className="field">
                {PRICING_UNITS.map((u) => (
                  <option key={u} value={u}>
                    Par {UNIT_LABEL_SHORT[u]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prix de base (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={form.basePrice}
                onChange={set('basePrice')}
                className="field"
              />
            </div>
          </div>
        </section>

        {/* 3. Localisation */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold">3. Localisation</h2>
          <div>
            <label className="label">Rechercher l&apos;adresse</label>
            <AddressAutocomplete
              value={addressQuery}
              onQueryChange={onAddressQueryChange}
              onSelect={onAddressSelect}
              placeholder="Rue et ville…"
            />
            <p className="mt-1 text-xs text-muted">
              Recherche via la Base Adresse Nationale — sert à localiser la voie. L&apos;adresse exacte
              reste masquée jusqu&apos;à la réservation.
            </p>
          </div>

          <div>
            <label className="label">Numéro et rue</label>
            <input
              type="text"
              value={form.addressLine1}
              onChange={set('addressLine1')}
              placeholder="12 rue de la Paix"
              className="field"
            />
            <p className="mt-1 text-xs text-muted">
              Complétez le numéro si la recherche ne l&apos;a pas trouvé.
            </p>
          </div>

          {geo && (
            <div className="flex items-start gap-2 rounded border border-line bg-canvas p-3 text-xs">
              <span className="text-brand-fg">📍</span>
              <span className="text-muted">
                <span className="font-semibold text-ink">
                  {geo.postalCode} {geo.city}
                </span>{' '}
                · {geo.context}
                <br />
                {geo.latitude.toFixed(5)}, {geo.longitude.toFixed(5)}
              </span>
            </div>
          )}

          <div>
            <label className="label">
              Complément d&apos;adresse <span className="font-normal">(bâtiment, étage, digicode…)</span>
            </label>
            <input type="text" value={form.addressLine2} onChange={set('addressLine2')} className="field" />
          </div>
        </section>

        {/* 4. Détails */}
        <section className="space-y-4">
          <h2 className="text-sm font-bold">4. Détails</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Frais de ménage (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.cleaningFee}
                onChange={set('cleaningFee')}
                className="field"
              />
            </div>
            <div>
              <label className="label">Nombre de locataires max</label>
              <input type="number" min="1" value={form.maxGuests} onChange={set('maxGuests')} className="field" />
            </div>
            <div>
              <label className="label">Politique d&apos;annulation</label>
              <select value={form.cancellationPolicy} onChange={set('cancellationPolicy')} className="field">
                {CANCELLATION_POLICIES.map((p) => (
                  <option key={p} value={p}>
                    {CANCELLATION_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">
              Équipements <span className="font-normal">(séparés par des virgules)</span>
            </label>
            <input
              type="text"
              value={form.amenities}
              onChange={set('amenities')}
              placeholder="wifi, parking, cuisine"
              className="field"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="instantBook"
              checked={form.instantBookEnabled}
              onChange={set('instantBookEnabled')}
              className="accent-brand"
            />
            Réservation instantanée (confirmée automatiquement)
          </label>
        </section>

        {/* 5. Photos */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold">5. Photos</h2>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-canvas py-6 text-center text-sm text-muted transition-colors hover:border-brand hover:text-ink">
            <span className="font-semibold">Ajouter des photos</span>
            <span className="text-xs">JPG / PNG · 10 Mo max · jusqu&apos;à 12</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addPhotos(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {photos.map((file, i) => (
                <div key={`${file.name}-${i}`} className="group relative aspect-[4/3] overflow-hidden rounded border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previews[i]}
                    alt={file.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/90 text-sm font-bold text-ink shadow-card"
                    aria-label="Retirer"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {error && <p className="text-sm text-danger-fg">{error}</p>}

        <div className="space-y-2">
          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Création…' : "Créer l'annonce"}
          </button>
          <p className="text-center text-xs text-muted">
            L&apos;annonce est créée en brouillon. Vous la publierez depuis « Mes annonces ».
          </p>
        </div>
      </form>
    </div>
  );
}
