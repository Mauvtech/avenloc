'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import AddressAutocomplete from '@/components/address-autocomplete';
import CategoryIcon from '@/components/category-icon';
import { BackLink } from '@/components/ui';
import { useToast } from '@/components/toast';
import { queueLead } from '@/lib/commercial-queue';
import { LISTING_TYPES, PRICING_UNITS, UNIT_LABEL_SHORT, typeLabel } from '@/lib/listing';
import type { GeoResult } from '@/lib/geo';
import type { Establishment } from '@/lib/types';
import { useCommercialGuard } from '../use-commercial-guard';

export default function NewCommercialLeadPage() {
  const { ready } = useCommercialGuard();
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
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink href="/commercial">Retour</BackLink>
      <h1 className="text-2xl font-extrabold">Nouvelle fiche</h1>
      <p className="text-sm text-muted">
        Créez le compte hôte, l&apos;établissement et l&apos;annonce en une fois — l&apos;hôte n&apos;a
        plus qu&apos;à activer son compte pour reprendre la main.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card space-y-3 p-4">
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
          <section className="card space-y-3 p-4">
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

        <section className="card space-y-3 p-4">
          <h2 className="section-title">Espace</h2>
          <div>
            <span className="label">Type</span>
            <div className="flex flex-wrap gap-2">
              {LISTING_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setListing((f) => ({ ...f, type: t }))}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                    listing.type === t ? 'border-ink bg-ink text-white' : 'border-line bg-surface text-ink hover:border-ink/40'
                  }`}
                >
                  <CategoryIcon type={t} size={16} />
                  {typeLabel(t)}
                </button>
              ))}
            </div>
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

        {error && <p className="text-sm text-danger-fg">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
          {loading ? 'Envoi…' : "Créer la fiche & inviter l'hôte"}
        </button>
        <p className="text-center text-xs text-muted">
          L&apos;annonce est créée en attente de validation par l&apos;hôte. Aucun réseau ? La fiche
          est enregistrée localement et envoyée automatiquement au retour de la connexion.
        </p>
      </form>
    </div>
  );
}
