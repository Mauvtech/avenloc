'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';
import CategoryIcon from '@/components/category-icon';
import AddressAutocomplete from '@/components/address-autocomplete';
import { BackLink, Stepper } from '@/components/ui';
import { useToast } from '@/components/toast';
import { eur } from '@/lib/format';
import type { GeoResult } from '@/lib/geo';
import {
  CANCELLATION_LABEL,
  CANCELLATION_POLICIES,
  capacityNoun,
  LISTING_TYPES,
  PRICING_UNITS,
  UNIT_LABEL_SHORT,
  typeLabel,
} from '@/lib/listing';

const STEPS = ['Type & description', 'Localisation', 'Prix & détails', 'Photos'];

export default function NewListingPage() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
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

  const [addressQuery, setAddressQuery] = useState('');
  const [geo, setGeo] = useState<GeoResult | null>(null);

  const [photos, setPhotos] = useState<File[]>([]);
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  useEffect(() => {
    if (!isAuthenticated()) router.replace('/auth/login');
  }, [router]);

  function onAddressSelect(r: GeoResult) {
    setGeo(r);
    setForm((f) => ({
      ...f,
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

  function movePhoto(i: number, dir: -1 | 1) {
    const t = i + dir;
    if (t < 0 || t >= photos.length) return;
    setPhotos((p) => {
      const next = [...p];
      [next[i], next[t]] = [next[t], next[i]];
      return next;
    });
  }

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value =
        e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
    };
  }

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (form.title.trim().length < 5) return 'Le titre doit faire au moins 5 caractères.';
      if (form.description.trim().length < 20)
        return 'La description doit faire au moins 20 caractères.';
    }
    if (s === 1) {
      if (!geo || !form.latitude || !form.longitude)
        return 'Sélectionnez une adresse dans la liste des suggestions.';
      if (!form.addressLine1.trim()) return 'Indiquez le numéro et le nom de la rue.';
    }
    if (s === 2) {
      if (!form.basePrice || parseFloat(form.basePrice) <= 0)
        return 'Indiquez un prix de base valide.';
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleCreate() {
    for (let s = 0; s < STEPS.length; s++) {
      const err = validateStep(s);
      if (err) {
        setError(err);
        setStep(s);
        return;
      }
    }
    setLoading(true);
    setError(null);
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
      for (const file of photos) {
        try {
          await api.listings.uploadPhoto(listing.id, file);
        } catch {
          /* non bloquant */
        }
      }
      toast.success('Annonce créée en brouillon');
      router.push(`/host?created=${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  }

  const amenList = form.amenities.split(',').map((a) => a.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/host">Retour à mes annonces</BackLink>
      <h1 className="text-2xl font-extrabold">Nouvelle annonce</h1>

      <div className="overflow-x-auto pb-1">
        <Stepper steps={STEPS} current={step} />
      </div>

      <div className="space-y-8">
        {/* Étape 1 */}
        {step === 0 && (
          <section className="space-y-4">
            <div>
              <span className="label">Type de local</span>
              <div className="flex flex-wrap gap-2">
                {LISTING_TYPES.map((t) => {
                  const active = form.type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                        active
                          ? 'border-brand bg-brand text-white'
                          : 'border-line bg-surface text-muted hover:text-ink'
                      }`}
                    >
                      <CategoryIcon type={t} size={16} />
                      {typeLabel(t)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="label">Titre de l&apos;annonce</label>
              <input
                type="text"
                minLength={5}
                value={form.title}
                onChange={set('title')}
                className="field"
                placeholder="Ex. Bureau lumineux proche gare"
              />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                minLength={20}
                rows={5}
                value={form.description}
                onChange={set('description')}
                className="field resize-y"
                placeholder="L’espace, ses atouts, l’accès, les règles d’usage…"
              />
              <p className="hint">{form.description.trim().length} / 20 caractères minimum</p>
            </div>
          </section>
        )}

        {/* Étape 2 */}
        {step === 1 && (
          <section className="space-y-4">
            <div>
              <label className="label">Rechercher l&apos;adresse</label>
              <AddressAutocomplete
                value={addressQuery}
                onQueryChange={(t) => {
                  setAddressQuery(t);
                  if (geo) setGeo(null);
                }}
                onSelect={onAddressSelect}
                placeholder="Rue et ville…"
              />
              <p className="hint">
                Via la Base Adresse Nationale. L&apos;adresse exacte reste masquée jusqu&apos;à la
                réservation.
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
            </div>
            {geo && (
              <div className="rounded-md border border-line bg-canvas p-3 text-sm">
                <span className="text-brand-fg">📍</span>{' '}
                <span className="font-semibold text-ink">
                  {geo.postalCode} {geo.city}
                </span>
                <span className="text-muted"> · {geo.context}</span>
              </div>
            )}
            <div>
              <label className="label">
                Complément <span className="font-normal">(bâtiment, étage, digicode…)</span>
              </label>
              <input
                type="text"
                value={form.addressLine2}
                onChange={set('addressLine2')}
                className="field"
              />
            </div>
          </section>
        )}

        {/* Étape 3 */}
        {step === 2 && (
          <section className="space-y-4">
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
                  value={form.basePrice}
                  onChange={set('basePrice')}
                  className="field"
                />
              </div>
            </div>
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
                <label className="label">Capacité max ({capacityNoun(form.type)})</label>
                <input
                  type="number"
                  min="1"
                  value={form.maxGuests}
                  onChange={set('maxGuests')}
                  className="field"
                />
              </div>
              <div>
                <label className="label">Politique d&apos;annulation</label>
                <select
                  value={form.cancellationPolicy}
                  onChange={set('cancellationPolicy')}
                  className="field"
                >
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
                checked={form.instantBookEnabled}
                onChange={set('instantBookEnabled')}
                className="accent-brand"
              />
              Réservation instantanée (confirmée automatiquement)
            </label>
          </section>
        )}

        {/* Étape 4 */}
        {step === 3 && (
          <section className="space-y-5">
            <div className="space-y-3">
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
                <>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {photos.map((file, i) => (
                      <div
                        key={`${file.name}-${i}`}
                        className="group relative aspect-[4/3] overflow-hidden rounded border border-line"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previews[i]}
                          alt={i === 0 ? 'Couverture' : `Photo ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {i === 0 && (
                          <span className="absolute left-1 top-1 rounded bg-surface/90 px-1.5 py-0.5 text-[10px] font-bold text-ink shadow-card">
                            Couverture
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                          className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/90 text-sm font-bold text-ink shadow-card"
                          aria-label="Retirer"
                        >
                          ✕
                        </button>
                        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-ink/40 p-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            disabled={i === 0}
                            onClick={() => movePhoto(i, -1)}
                            className="rounded bg-surface px-1.5 text-xs font-bold text-ink disabled:opacity-30"
                            aria-label="Déplacer vers la gauche"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            disabled={i === photos.length - 1}
                            onClick={() => movePhoto(i, 1)}
                            className="rounded bg-surface px-1.5 text-xs font-bold text-ink disabled:opacity-30"
                            aria-label="Déplacer vers la droite"
                          >
                            ›
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="hint">La première photo sert de couverture.</p>
                </>
              )}
            </div>

            {/* Récapitulatif */}
            <div className="card space-y-2 p-4 text-sm">
              <p className="section-title">Récapitulatif</p>
              <Recap k="Type" v={typeLabel(form.type)} />
              <Recap k="Titre" v={form.title || '—'} />
              <Recap
                k="Adresse"
                v={form.addressLine1 ? `${form.addressLine1}, ${form.postalCode} ${form.city}` : '—'}
              />
              <Recap
                k="Prix"
                v={
                  form.basePrice
                    ? `${eur(form.basePrice)} / ${UNIT_LABEL_SHORT[form.pricingUnit]}`
                    : '—'
                }
              />
              {amenList.length > 0 && <Recap k="Équipements" v={amenList.join(', ')} />}
              <Recap k="Photos" v={`${photos.length}`} />
              <Recap
                k="Réservation"
                v={form.instantBookEnabled ? 'Instantanée' : 'Sur validation'}
              />
            </div>
          </section>
        )}

        {error && <p className="text-sm text-danger-fg">{error}</p>}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          {step > 0 ? (
            <button type="button" onClick={back} className="btn-ghost">
              Précédent
            </button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="btn-primary">
              Continuer
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="btn-primary btn-lg"
            >
              {loading ? 'Création…' : "Créer l'annonce"}
            </button>
          )}
        </div>
        <p className="text-center text-xs text-muted">
          L&apos;annonce est créée en brouillon. Vous la publierez depuis « Mes annonces ».
        </p>
      </div>
    </div>
  );
}

function Recap({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="flex-none text-muted">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}
