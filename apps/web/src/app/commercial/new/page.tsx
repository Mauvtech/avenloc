'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AddressAutocomplete from '@/components/address-autocomplete';
import { BackLink } from '@/components/ui';
import { useToast } from '@/components/toast';
import { queueLead } from '@/lib/commercial-queue';
import { LISTING_TYPES, PRICING_UNITS, UNIT_LABEL_SHORT, typeLabel } from '@/lib/listing';
import type { GeoResult } from '@/lib/geo';
import type { Establishment } from '@/lib/types';
import { useCommercialGuard } from '../use-commercial-guard';

export default function NewCommercialLeadPage() {
  const { ready } = useCommercialGuard();
  const [step, setStep] = useState(0);
  const router = useRouter();
  const toast = useToast();

  const [host, setHost] = useState({ email: '', firstName: '', lastName: '', phone: '' });
  const [existingEstablishments, setExistingEstablishments] = useState<Establishment[]>([]);
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [looking, setLooking] = useState(false);

  const [establishment, setEstablishment] = useState({
    name: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    postalCode: '',
    country: 'FR',
    latitude: 0,
    longitude: 0,
  });
  const [addressQuery, setAddressQuery] = useState('');

  const [listing, setListing] = useState({
    type: 'MEETING_ROOM',
    title: '',
    description: '',
    basePrice: '',
    pricingUnit: 'HOUR',
    depositAmount: '',
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function lookupEstablishments() {
    if (!host.email.trim()) return;
    setLooking(true);
    try {
      const results = await api.commercial.establishmentsByHostEmail(host.email.trim());
      setExistingEstablishments(results);
      if (results.length === 0) toast.info('Aucun établissement existant pour cet email.');
    } catch {
      setExistingEstablishments([]);
    } finally {
      setLooking(false);
    }
  }

  function onAddressSelect(r: GeoResult) {
    setEstablishment((f) => ({
      ...f,
      addressLine1: r.addressLine1 || r.label,
      city: r.city,
      postalCode: r.postalCode,
      country: 'FR',
      latitude: r.latitude,
      longitude: r.longitude,
    }));
  }

  function buildPayload() {
    return {
      host,
      establishment: establishmentId
        ? { existingId: establishmentId }
        : { ...establishment, addressLine2: establishment.addressLine2 || undefined },
      listing: {
        type: listing.type,
        title: listing.title,
        description: listing.description,
        addressLine1: establishment.addressLine1,
        city: establishment.city,
        postalCode: establishment.postalCode,
        country: establishment.country,
        latitude: establishment.latitude,
        longitude: establishment.longitude,
        pricingUnit: listing.pricingUnit,
        basePrice: parseFloat(listing.basePrice) || 0,
        depositAmount: listing.depositAmount ? parseFloat(listing.depositAmount) : undefined,
        cancellationPolicy: 'MODERATE',
        instantBookEnabled: false,
        amenities: [],
      },
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (step < 2) {
      if (step === 0 && !establishmentId && (!establishment.name || !establishment.addressLine1 || !establishment.city)) {
        setError("Sélectionnez une adresse pour l’établissement.");
        return;
      }
      setError(null);
      setStep(step + 1);
      return;
    }
    if (!host.email || !host.firstName || !host.lastName) {
      setError("Merci de renseigner l'identité de l'hôte.");
      return;
    }
    if (!listing.title || listing.title.trim().length < 5) {
      setError('Le titre de l’espace doit faire au moins 5 caractères.');
      return;
    }
    if (!establishmentId && (!establishment.name || !establishment.addressLine1 || !establishment.city)) {
      setError("Sélectionnez une adresse pour l'établissement.");
      return;
    }
    setError(null);
    setLoading(true);
    const payload = buildPayload();
    try {
      const result = await api.commercial.createLead(payload);
      toast.success('Fiche envoyée — invitation générée pour l’hôte.');
      router.push(`/commercial/history?created=${result.invitation.id}`);
    } catch (err) {
      // Hors-ligne (visite terrain) : on garde la fiche pour l'envoyer au retour du réseau.
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (offline || err instanceof TypeError) {
        queueLead(payload);
        toast.info('Pas de réseau — la fiche est enregistrée et sera envoyée automatiquement.');
        router.push('/commercial');
      } else {
        setError(err instanceof Error ? err.message : 'Erreur lors de la création');
      }
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-[640px] space-y-6 px-0 py-2 min-[641px]:px-8">
      <BackLink href="/commercial">Retour</BackLink>
      <h1 className="text-[22px] font-bold">Créer une fiche pendant la visite</h1>
      <p className="text-[13px] text-muted">Formulaire rapide — l’hôte n’aura plus qu’à valider avant publication.</p>
      <div className="flex gap-1.5" aria-label={`Étape ${step + 1} sur 3`}>
        {['Destinataire', 'Essentiel', 'Récapitulatif'].map((label,i) => <div key={label} title={label} className={`h-[3px] flex-1 rounded-sm ${i <= step ? 'bg-brand' : 'bg-line'}`} />)}
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset disabled={step !== 0} hidden={step !== 0} className="space-y-6">
        <section className="space-y-4">
          <h2 className="section-title">Hôte</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Email</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={host.email}
                  onChange={(e) => setHost((f) => ({ ...f, email: e.target.value }))}
                  className="field"
                />
                <button type="button" onClick={lookupEstablishments} disabled={looking} className="btn-ghost whitespace-nowrap">
                  {looking ? '…' : 'Chercher'}
                </button>
              </div>
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input
                type="tel"
                value={host.phone}
                onChange={(e) => setHost((f) => ({ ...f, phone: e.target.value }))}
                className="field"
              />
            </div>
            <div>
              <label className="label">Prénom</label>
              <input
                required
                value={host.firstName}
                onChange={(e) => setHost((f) => ({ ...f, firstName: e.target.value }))}
                className="field"
              />
            </div>
            <div>
              <label className="label">Nom</label>
              <input
                required
                value={host.lastName}
                onChange={(e) => setHost((f) => ({ ...f, lastName: e.target.value }))}
                className="field"
              />
            </div>
          </div>
          {existingEstablishments.length > 0 && (
            <div className="space-y-1.5 rounded-md border border-line bg-canvas p-3">
              <p className="text-xs font-semibold text-muted">Établissements existants de cet hôte</p>
              {existingEstablishments.map((e) => (
                <label key={e.id} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="establishment"
                    checked={establishmentId === e.id}
                    onChange={() => setEstablishmentId(e.id)}
                  />
                  {e.name} — {e.addressLine1}, {e.city}
                </label>
              ))}
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="establishment" checked={establishmentId === null} onChange={() => setEstablishmentId(null)} />
                Nouvel établissement
              </label>
            </div>
          )}
        </section>

        {!establishmentId && (
          <section className="space-y-4">
            <h2 className="section-title">Établissement</h2>
            <div>
              <label className="label">Nom de l&apos;établissement</label>
              <input
                required
                value={establishment.name}
                onChange={(e) => setEstablishment((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex. Immeuble Champs-Élysées"
                className="field"
              />
            </div>
            <div>
              <label className="label">Adresse</label>
              <AddressAutocomplete
                value={addressQuery}
                onQueryChange={setAddressQuery}
                onSelect={onAddressSelect}
                placeholder="Rue et ville…"
              />
            </div>
            {establishment.addressLine1 && (
              <div className="rounded-md border border-line bg-canvas p-3 text-sm">
                📍 {establishment.addressLine1}, {establishment.postalCode} {establishment.city}
              </div>
            )}
          </section>
        )}

        </fieldset>
        <fieldset disabled={step !== 1} hidden={step !== 1}>
        <section className="space-y-4">
          <h2 className="section-title">Espace</h2>
          <div>
            <label className="label" htmlFor="commercial-listing-type">Type</label>
            <select
              id="commercial-listing-type"
              value={listing.type}
              onChange={(e) => setListing((f) => ({ ...f, type: e.target.value as (typeof LISTING_TYPES)[number] }))}
              className="field"
            >
              {LISTING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Nom de l&apos;espace</label>
            <input
              required
              minLength={5}
              value={listing.title}
              onChange={(e) => setListing((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex. Salle Atlas"
              className="field"
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              required
              minLength={20}
              rows={3}
              value={listing.description}
              onChange={(e) => setListing((f) => ({ ...f, description: e.target.value }))}
              className="field resize-y"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Unité de prix</label>
              <select
                value={listing.pricingUnit}
                onChange={(e) => setListing((f) => ({ ...f, pricingUnit: e.target.value }))}
                className="field"
              >
                {PRICING_UNITS.map((u) => (
                  <option key={u} value={u}>
                    Par {UNIT_LABEL_SHORT[u]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prix (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={listing.basePrice}
                onChange={(e) => setListing((f) => ({ ...f, basePrice: e.target.value }))}
                className="field"
              />
            </div>
            <div>
              <label className="label">Caution (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={listing.depositAmount}
                onChange={(e) => setListing((f) => ({ ...f, depositAmount: e.target.value }))}
                placeholder="Aucune"
                className="field"
              />
            </div>
          </div>
        </section>

        </fieldset>
        {step === 2 && <section className="card divide-y divide-line px-5">
          {[['Hôte', `${host.firstName} ${host.lastName}`], ['Email', host.email], ['Établissement', establishmentId ? existingEstablishments.find((e) => e.id === establishmentId)?.name : establishment.name], ['Espace', listing.title], ['Type', typeLabel(listing.type)], ['Prix', `${listing.basePrice} € / ${UNIT_LABEL_SHORT[listing.pricingUnit]}`]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-3 text-sm"><span className="text-muted">{label}</span><span className="text-right">{value}</span></div>)}
        </section>}
        {error && <p role="alert" className="text-sm text-danger-fg">{error}</p>}

        <div className="flex justify-between gap-3">
          <button type="button" disabled={step === 0 || loading} onClick={() => { setStep(step - 1); setError(null); }} className="btn-ghost">Précédent</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Envoi…' : step < 2 ? 'Suivant' : "Envoyer à l’hôte pour validation"}</button>
        </div>
        <p className="text-center text-xs text-muted">
          L&apos;annonce est créée en attente de validation par l&apos;hôte. Aucun réseau ? La fiche
          est enregistrée localement et envoyée automatiquement au retour de la connexion.
        </p>
      </form>
    </div>
  );
}
