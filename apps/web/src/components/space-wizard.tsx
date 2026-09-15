'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AddressAutocomplete from '@/components/address-autocomplete';
import AmenitiesPicker from '@/components/amenities-picker';
import { Stepper } from '@/components/ui';
import { useToast } from '@/components/toast';
import { eur } from '@/lib/format';
import { amenityLabel } from '@/lib/listing';
import type { GeoResult } from '@/lib/geo';
import {
  capacityNoun,
  LISTING_TYPES,
  PRICING_UNITS,
  UNIT_LABEL_SHORT,
  typeLabel,
} from '@/lib/listing';
import type { Listing } from '@/lib/types';

interface WizardForm {
  hostEmail: string;
  hostName: string;
  hostPhone: string;
  establishment: string;
  nom: string;
  type: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
  latitude: string;
  longitude: string;
  maxGuests: string;
  superficie: string;
  pricingUnit: string;
  basePrice: string;
  amenities: string[];
  title: string;
  description: string;
  faq: { question: string; reponse: string }[];
}

const initialForm: WizardForm = {
  hostEmail: '',
  hostName: '',
  hostPhone: '',
  establishment: '',
  nom: '',
  type: 'MEETING_ROOM',
  addressLine1: '',
  addressLine2: '',
  city: '',
  postalCode: '',
  country: 'FR',
  latitude: '',
  longitude: '',
  maxGuests: '',
  superficie: '',
  pricingUnit: 'HOUR',
  basePrice: '',
  amenities: [],
  title: '',
  description: '',
  faq: [],
};

export interface SpaceWizardResult {
  listing: Listing;
  isNewHost: boolean;
  devActivationUrl: string | null;
  hostName: string;
  hostEmail: string;
  establishment: string;
}

interface Props {
  context: 'host' | 'commercial';
  /** Par défaut (contexte host) : redirige vers /host. En contexte commercial, affiche la confirmation. */
  onCreated?: (result: SpaceWizardResult) => void;
}

// Wizard de création d'espace — voir CommercialWizard dans le design de
// référence. Réutilisé à l'identique pour la création en libre-service par un
// hôte (context="host") et pour la création par un commercial pour le compte
// d'un hôte (context="commercial", étape « Destinataire » en plus).
export default function SpaceWizard({ context, onCreated }: Props) {
  const router = useRouter();
  const toast = useToast();
  const isCommercial = context === 'commercial';

  const [form, setForm] = useState<WizardForm>(initialForm);
  const [addressQuery, setAddressQuery] = useState('');
  const [geo, setGeo] = useState<GeoResult | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const previews = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const steps = [
    ...(isCommercial ? ['Destinataire'] : []),
    'Essentiel',
    'Équipements',
    'Photos',
    'Récapitulatif',
    'Génération',
  ];
  const [step, setStep] = useState(0);
  const current = steps[step];
  const [genStatus, setGenStatus] = useState<'idle' | 'done'>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof WizardForm>(field: K, value: WizardForm[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

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

  const hostStepValid =
    !isCommercial ||
    (form.establishment.trim() && form.hostName.trim() && (form.hostEmail.trim() || form.hostPhone.trim()));

  function validateCurrentStep(): string | null {
    if (current === 'Destinataire' && !hostStepValid) {
      return "Renseignez l'établissement, le nom du contact et au moins un moyen de le joindre.";
    }
    if (current === 'Essentiel') {
      if (form.nom.trim().length < 5) return "Le nom de l'espace doit faire au moins 5 caractères.";
      if (!geo || !form.latitude || !form.longitude) return 'Sélectionnez une adresse dans les suggestions.';
      if (!form.basePrice || parseFloat(form.basePrice) <= 0) return 'Indiquez un prix de base valide.';
    }
    return null;
  }

  function goNext() {
    const err = validateCurrentStep();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    setPhotos((prev) => [...prev, ...imgs].slice(0, 12));
  }

  function generateFiche() {
    const typeLbl = typeLabel(form.type).toLowerCase();
    const title = `${form.nom || 'Espace'} — ${typeLabel(form.type)} au calme`;
    const description = `${form.nom || 'Cet espace'} est un ${typeLbl} de ${
      form.maxGuests || 'plusieurs'
    } personnes, situé ${form.city ? `à ${form.city}` : 'en centre-ville'}. Idéal pour vos réunions, rendez-vous ou séances de travail, avec un accès simple et un usage autonome dès la réservation.`;
    const amenitiesText = form.amenities.length
      ? form.amenities.map(amenityLabel).join(', ').toLowerCase()
      : 'les équipements présentés';
    setForm((f) => ({
      ...f,
      title,
      description,
      faq: [
        {
          question: "Comment accéder à l'espace le jour J ?",
          reponse:
            "Les instructions d'accès (adresse précise, code, contact) sont envoyées automatiquement après réservation.",
        },
        {
          question: 'Le prix inclut-il les équipements listés ?',
          reponse: `Oui, ${amenitiesText} sont inclus dans le tarif affiché.`,
        },
      ],
    }));
    setGenStatus('done');
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        type: form.type,
        title: form.title || form.nom,
        description: form.description || `${form.nom} — annonce en cours de complétion.`,
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
        // Conditions (validation manuelle, RC Pro, règlement), politique
        // d'annulation et disponibilités horaires ne sont pas collectées à la
        // création (voir CommercialWizard dans le design de référence) — l'hôte
        // les configure ensuite depuis l'onglet correspondant de sa fiche.
        // Instant book par défaut (comme les fiches créées par un commercial).
        instantBookEnabled: true,
        faq: form.faq.filter((f) => f.question.trim() && f.reponse.trim()),
        amenities: form.amenities,
        specificAttributes: form.superficie ? { surface_m2: Number(form.superficie) } : undefined,
        ...(isCommercial
          ? {
              hostEmail: form.hostEmail.trim(),
              hostName: form.hostName.trim(),
              hostPhone: form.hostPhone || undefined,
              establishment: form.establishment.trim() || undefined,
            }
          : {}),
      };

      const result = isCommercial
        ? await api.listings.createCommercial(payload)
        : { listing: await api.listings.create(payload), isNewHost: false, devActivationUrl: null };

      for (const file of photos) {
        try {
          await api.listings.uploadPhoto(result.listing.id, file);
        } catch {
          /* non bloquant */
        }
      }
      if (onCreated) {
        onCreated({
          ...result,
          hostName: form.hostName,
          hostEmail: form.hostEmail,
          establishment: form.establishment,
        });
      } else {
        toast.success('Annonce créée en brouillon');
        router.push(`/host?created=${result.listing.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">
          {isCommercial ? 'Créer une fiche pendant la visite' : 'Créer un nouvel espace'}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {isCommercial
            ? "Formulaire rapide — l'hôte n'aura plus qu'à valider avant publication."
            : 'Ce formulaire génère la fiche automatiquement à partir des informations essentielles.'}
        </p>
      </div>

      <div className="overflow-x-auto pb-1">
        <Stepper steps={steps} current={step} />
      </div>

      <div className="space-y-6">
        {current === 'Destinataire' && (
          <section className="space-y-4">
            <p className="text-xs text-muted">
              Cette fiche sera envoyée pour validation à l&apos;hôte que vous identifiez ici.
            </p>
            <div>
              <label className="label">Établissement</label>
              <input
                type="text"
                value={form.establishment}
                onChange={(e) => set('establishment', e.target.value)}
                placeholder="ex. Centre d'affaires Opéra"
                className="field"
              />
            </div>
            <div>
              <label className="label">Nom du contact hôte</label>
              <input
                type="text"
                value={form.hostName}
                onChange={(e) => set('hostName', e.target.value)}
                placeholder="Prénom et nom"
                className="field"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={form.hostEmail}
                  onChange={(e) => set('hostEmail', e.target.value)}
                  placeholder="hote@exemple.com"
                  className="field"
                />
              </div>
              <div>
                <label className="label">Téléphone</label>
                <input
                  type="tel"
                  value={form.hostPhone}
                  onChange={(e) => set('hostPhone', e.target.value)}
                  placeholder="+33 6 …"
                  className="field"
                />
              </div>
            </div>
            {!hostStepValid && (
              <p className="text-xs text-muted">
                Renseignez l&apos;établissement, le nom du contact et au moins un moyen de le joindre.
              </p>
            )}
          </section>
        )}

        {current === 'Essentiel' && (
          <section className="space-y-4">
            <div>
              <label className="label">Nom de l&apos;espace</label>
              <input
                type="text"
                value={form.nom}
                onChange={(e) => set('nom', e.target.value)}
                placeholder="ex. Salle Atlas"
                className="field"
              />
            </div>
            <div>
              <label className="label">Type d&apos;espace</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)} className="field">
                {LISTING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {typeLabel(t)}
                  </option>
                ))}
              </select>
            </div>
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
              {geo && (
                <p className="mt-1.5 text-xs text-muted">
                  📍 {geo.postalCode} {geo.city} · {geo.context}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div>
                <label className="label">Capacité ({capacityNoun(form.type)})</label>
                <input
                  type="number"
                  min="1"
                  value={form.maxGuests}
                  onChange={(e) => set('maxGuests', e.target.value)}
                  className="field"
                />
              </div>
              <div>
                <label className="label">Superficie (m²)</label>
                <input
                  type="number"
                  min="0"
                  value={form.superficie}
                  onChange={(e) => set('superficie', e.target.value)}
                  className="field"
                />
              </div>
              <div>
                <label className="label">Unité de prix</label>
                <select
                  value={form.pricingUnit}
                  onChange={(e) => set('pricingUnit', e.target.value)}
                  className="field"
                >
                  {PRICING_UNITS.map((u) => (
                    <option key={u} value={u}>
                      Par {UNIT_LABEL_SHORT[u]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Prix de base (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.basePrice}
                onChange={(e) => set('basePrice', e.target.value)}
                className="field"
              />
            </div>
          </section>
        )}

        {current === 'Équipements' && (
          <section>
            <AmenitiesPicker value={form.amenities} onChange={(v) => set('amenities', v)} />
          </section>
        )}

        {current === 'Photos' && (
          <section className="space-y-3">
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
                    <img src={previews[i]} alt="" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/90 text-sm font-bold text-ink shadow-card"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {current === 'Récapitulatif' && (
          <section className="space-y-4">
            {isCommercial && (
              <div className="card space-y-1 p-4 text-sm">
                <p className="text-xs text-muted">Destinataire de la validation</p>
                <p className="font-bold">{form.hostName || 'Contact non renseigné'}</p>
                <p className="text-muted">{form.establishment || '—'}</p>
                <p className="text-muted">{[form.hostEmail, form.hostPhone].filter(Boolean).join(' · ')}</p>
              </div>
            )}
            <div className="card space-y-1 p-4 text-sm">
              <p className="text-base font-bold">{form.nom || 'Nom non renseigné'}</p>
              <p className="text-muted">
                {typeLabel(form.type)} · {form.addressLine1 || 'Adresse non renseignée'}
              </p>
              <p>
                {form.maxGuests || '—'} {capacityNoun(form.type)} · {form.superficie || '—'} m² ·{' '}
                {form.basePrice ? eur(form.basePrice) : '—'} / {UNIT_LABEL_SHORT[form.pricingUnit]} ·{' '}
                {photos.length} photo(s) · {form.amenities.length} équipement(s)
              </p>
            </div>
            <p className="text-xs text-muted">
              À l&apos;étape suivante, le titre, la description, les tags et la FAQ seront générés
              automatiquement à partir de ces informations, et resteront modifiables avant l&apos;envoi.
            </p>
          </section>
        )}

        {current === 'Génération' && (
          <section>
            {genStatus === 'idle' ? (
              <button type="button" onClick={generateFiche} className="btn-primary w-full">
                Générer la fiche automatiquement
              </button>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="label">Titre</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => set('title', e.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    className="field resize-y"
                  />
                </div>
                <div>
                  <label className="label">Tags</label>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {[typeLabel(form.type), ...form.amenities.slice(0, 3).map(amenityLabel)].map((t) => (
                      <span key={t} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="label mb-0">FAQ</label>
                    <button
                      type="button"
                      onClick={() => set('faq', [...form.faq, { question: '', reponse: '' }])}
                      className="text-xs font-semibold text-brand-fg hover:underline"
                    >
                      + Ajouter une question
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.faq.map((item, i) => (
                      <div key={i} className="relative rounded-md border border-line p-2.5">
                        <button
                          type="button"
                          onClick={() => set('faq', form.faq.filter((_, idx) => idx !== i))}
                          className="absolute right-2 top-2 text-xs text-muted hover:text-danger-fg"
                        >
                          ✕
                        </button>
                        <input
                          type="text"
                          value={item.question}
                          onChange={(e) => {
                            const faq = [...form.faq];
                            faq[i] = { ...faq[i], question: e.target.value };
                            set('faq', faq);
                          }}
                          placeholder="Question"
                          className="field mb-1.5 pr-6 text-sm"
                        />
                        <textarea
                          rows={2}
                          value={item.reponse}
                          onChange={(e) => {
                            const faq = [...form.faq];
                            faq[i] = { ...faq[i], reponse: e.target.value };
                            set('faq', faq);
                          }}
                          placeholder="Réponse"
                          className="field resize-y text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={generateFiche} className="btn-ghost">
                  Régénérer
                </button>
              </div>
            )}
          </section>
        )}

        {error && <p className="text-sm text-danger-fg">{error}</p>}

        <div className="flex items-center justify-between gap-3">
          {step > 0 ? (
            <button type="button" onClick={goBack} className="btn-ghost">
              Précédent
            </button>
          ) : (
            <span />
          )}
          {step < steps.length - 1 ? (
            <button type="button" onClick={goNext} className="btn-primary">
              Suivant
            </button>
          ) : (
            <button
              type="button"
              disabled={genStatus !== 'done' || submitting}
              onClick={handleSubmit}
              className="btn-primary btn-lg"
            >
              {submitting
                ? 'Envoi…'
                : isCommercial
                  ? "Envoyer à l'hôte pour validation"
                  : "Publier l'espace"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
