'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, usePathname, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated, loginHref } from '@/lib/auth';
import ListingPhotos from '@/components/listing-photos';
import AmenitiesPicker from '@/components/amenities-picker';
import AvailabilityRulesEditor, { type RuleDraft } from '@/components/availability-rules-editor';
import AvailabilityCalendar from '@/components/availability-calendar';
import { useToast } from '@/components/toast';
import { PageLoader, Toggle } from '@/components/ui';
import {
  ACCESS_METHOD_LABEL,
  ACCESS_METHODS,
  CANCELLATION_DETAIL,
  CANCELLATION_LABEL,
  CANCELLATION_POLICIES,
  capacityNoun,
  typeLabel,
  UNIT_LABEL_SHORT,
} from '@/lib/listing';
import type { Listing, ListingAvailabilityRule } from '@/lib/types';

const TABS = ['Aperçu', 'Équipements & FAQ', 'Disponibilités', "Politique d'annulation", 'Conditions'] as const;
type Tab = (typeof TABS)[number];

export default function EditListingPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EditListingPageInner />
    </Suspense>
  );
}

function EditListingPageInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const initialTab = TABS.find((t) => t === searchParams.get('tab')) ?? 'Aperçu';
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(loginHref(pathname));
      return;
    }
    Promise.all([api.auth.me(), api.listings.getById(id)])
      .then(([me, l]) => {
        if (l.hostId !== me.id) return router.replace('/host');
        setListing(l);
      })
      .catch(() => router.replace('/host'))
      .finally(() => setLoading(false));
  }, [id, router]);

  function patchListing(patch: Partial<Listing>) {
    setListing((l) => (l ? { ...l, ...patch } : l));
  }

  async function publish() {
    setPublishing(true);
    try {
      const updated = await api.listings.setStatus(id, 'PUBLISHED');
      patchListing(updated);
      toast.success('Fiche publiée');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publication impossible');
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <PageLoader />;
  if (!listing) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/host" className="text-sm text-muted hover:text-ink">
          ← Mes annonces
        </Link>
        <h1 className="mt-1 text-2xl font-extrabold">{listing.title}</h1>
        <p className="text-sm text-muted">{typeLabel(listing.type)}</p>
      </div>

      {listing.createdByCommercial && listing.status === 'DRAFT' && (
        <div className="rounded-md bg-warn-tint px-3.5 py-2.5 text-sm text-warn-fg">
          Cette fiche a été préconfigurée par un commercial lors d&apos;une visite. Vérifiez les
          informations puis validez pour la publier.
        </div>
      )}

      <div className="flex flex-wrap gap-1 rounded-lg bg-canvas p-[3px]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors ${
              tab === t ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Aperçu' && <OverviewTab listing={listing} onSaved={patchListing} toast={toast} />}
      {tab === 'Équipements & FAQ' && (
        <EquipmentsFaqTab listing={listing} onSaved={patchListing} toast={toast} />
      )}
      {tab === 'Disponibilités' && <AvailabilityTab listing={listing} toast={toast} />}
      {tab === "Politique d'annulation" && (
        <CancellationTab listing={listing} onSaved={patchListing} toast={toast} />
      )}
      {tab === 'Conditions' && <ConditionsTab listing={listing} onSaved={patchListing} toast={toast} />}

      {listing.createdByCommercial && listing.status === 'DRAFT' && (
        <button type="button" onClick={publish} disabled={publishing} className="btn-primary">
          {publishing ? '…' : 'Valider et publier la fiche'}
        </button>
      )}
    </div>
  );
}

type ToastApi = ReturnType<typeof useToast>;

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-line py-2 text-sm last:border-b-0">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}

function OverviewTab({
  listing,
  onSaved,
  toast,
}: {
  listing: Listing;
  onSaved: (p: Partial<Listing>) => void;
  toast: ToastApi;
}) {
  const [form, setForm] = useState({
    title: listing.title,
    description: listing.description,
    basePrice: String(listing.basePrice ?? ''),
    cleaningFee: listing.cleaningFee != null ? String(listing.cleaningFee) : '',
    maxGuests: listing.maxGuests != null ? String(listing.maxGuests) : '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.listings.update(listing.id, {
        title: form.title,
        description: form.description,
        basePrice: parseFloat(form.basePrice),
        cleaningFee: form.cleaningFee ? parseFloat(form.cleaningFee) : undefined,
        maxGuests: form.maxGuests ? parseInt(form.maxGuests, 10) : undefined,
      });
      onSaved(updated);
      toast.success('Annonce mise à jour');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-1 p-4">
        <InfoRow label="Type" value={typeLabel(listing.type)} />
        <InfoRow label="Adresse" value={`${listing.addressLine1}, ${listing.postalCode} ${listing.city}`} />
        {listing.maxGuests != null && (
          <InfoRow label="Capacité" value={`${listing.maxGuests} ${capacityNoun(listing.type)}`} />
        )}
        {typeof listing.specificAttributes?.surface_m2 === 'number' && (
          <InfoRow label="Superficie" value={`${listing.specificAttributes.surface_m2} m²`} />
        )}
        <InfoRow label="Unité de prix" value={UNIT_LABEL_SHORT[listing.pricingUnit] ?? listing.pricingUnit} />
        <InfoRow
          label="Vérification"
          value={listing.host?.verified ? 'Vérifié' : 'Non vérifié'}
        />
      </div>

      <form onSubmit={handleSave} className="card space-y-4 p-5">
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
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>

      <div className="card space-y-4 p-5">
        <h2 className="section-title">Photos</h2>
        <ListingPhotos listingId={listing.id} initialPhotos={listing.photos} />
      </div>
    </div>
  );
}

function EquipmentsFaqTab({
  listing,
  onSaved,
  toast,
}: {
  listing: Listing;
  onSaved: (p: Partial<Listing>) => void;
  toast: ToastApi;
}) {
  const [amenities, setAmenities] = useState<string[]>(listing.amenities);
  const [faq, setFaq] = useState<{ question: string; reponse: string }[]>(listing.faq ?? []);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.listings.update(listing.id, {
        amenities,
        faq: faq.filter((f) => f.question.trim() && f.reponse.trim()),
      });
      onSaved(updated);
      toast.success('Équipements et FAQ mis à jour');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="mb-2.5 text-sm font-bold">Équipements</h2>
        <AmenitiesPicker value={amenities} onChange={setAmenities} />
      </div>

      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-bold">FAQ</h2>
          <button
            type="button"
            onClick={() => setFaq((f) => [...f, { question: '', reponse: '' }])}
            className="text-xs font-semibold text-brand-fg hover:underline"
          >
            + Ajouter une question
          </button>
        </div>
        {faq.length === 0 && <p className="text-sm text-muted">Aucune question pour l&apos;instant.</p>}
        <div className="space-y-2">
          {faq.map((item, i) => (
            <div key={i} className="relative rounded-md border border-line p-2.5">
              <button
                type="button"
                onClick={() => setFaq((f) => f.filter((_, idx) => idx !== i))}
                className="absolute right-2 top-2 text-xs text-muted hover:text-danger-fg"
              >
                ✕
              </button>
              <input
                type="text"
                value={item.question}
                onChange={(e) => {
                  const copy = [...faq];
                  copy[i] = { ...copy[i], question: e.target.value };
                  setFaq(copy);
                }}
                placeholder="Question"
                className="field mb-1.5 pr-6 text-sm"
              />
              <textarea
                rows={2}
                value={item.reponse}
                onChange={(e) => {
                  const copy = [...faq];
                  copy[i] = { ...copy[i], reponse: e.target.value };
                  setFaq(copy);
                }}
                placeholder="Réponse"
                className="field resize-y text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <button type="button" onClick={handleSave} disabled={saving} className="btn-primary">
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </div>
  );
}

function AvailabilityTab({ listing, toast }: { listing: Listing; toast: ToastApi }) {
  const isHour = listing.pricingUnit === 'HOUR';
  const [existing, setExisting] = useState<ListingAvailabilityRule[] | null>(null);
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isHour) return;
    api.listings
      .availabilityRules(listing.id)
      .then((rs) => {
        setExisting(rs);
        setRules(
          rs.map((r) => ({
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
            minDurationMinutes: r.minDurationMinutes,
            minLeadTimeMinutes: r.minLeadTimeMinutes,
          })),
        );
      })
      .catch(() => setExisting([]));
  }, [listing.id, isHour]);

  async function handleSave() {
    if (!existing) return;
    setSaving(true);
    try {
      await Promise.all(existing.map((r) => api.listings.deleteAvailabilityRule(listing.id, r.id)));
      const created = await Promise.all(rules.map((r) => api.listings.addAvailabilityRule(listing.id, r)));
      setExisting(created);
      toast.success('Créneaux horaires mis à jour');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {isHour && (
        <div>
          <h2 className="mb-2.5 text-sm font-bold">Horaires hebdomadaires</h2>
          {existing === null ? (
            <p className="text-sm text-muted">Chargement…</p>
          ) : (
            <>
              <AvailabilityRulesEditor value={rules} onChange={setRules} />
              <button type="button" onClick={handleSave} disabled={saving} className="btn-primary mt-3">
                {saving ? 'Enregistrement…' : 'Enregistrer les disponibilités'}
              </button>
            </>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-2.5 text-sm font-bold">
          {isHour ? 'Indisponibilités exceptionnelles (jours entiers)' : 'Calendrier de disponibilité'}
        </h2>
        <div className="card p-4">
          <AvailabilityCalendar listingId={listing.id} />
        </div>
      </div>
    </div>
  );
}

function CancellationTab({
  listing,
  onSaved,
  toast,
}: {
  listing: Listing;
  onSaved: (p: Partial<Listing>) => void;
  toast: ToastApi;
}) {
  const [selected, setSelected] = useState(listing.cancellationPolicy);
  const [saving, setSaving] = useState(false);

  async function choose(policy: string) {
    setSelected(policy);
    setSaving(true);
    try {
      const updated = await api.listings.update(listing.id, { cancellationPolicy: policy });
      onSaved(updated);
      toast.success('Politique d’annulation mise à jour');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2.5">
      {CANCELLATION_POLICIES.map((p) => {
        const isSelected = selected === p;
        const detail = CANCELLATION_DETAIL[p];
        return (
          <button
            key={p}
            type="button"
            disabled={saving}
            onClick={() => choose(p)}
            className={`w-full rounded-lg border p-3.5 text-left transition-colors ${
              isSelected ? 'border-ink' : 'border-line hover:border-ink/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`mt-0.5 h-4 w-4 flex-none rounded-full border-2 ${
                  isSelected ? 'border-ink bg-ink' : 'border-line'
                }`}
              />
              <div className="flex-1">
                <p className="text-sm font-bold">{CANCELLATION_LABEL[p] ?? p}</p>
                {detail && <p className="mt-0.5 text-xs text-muted">{detail.summary}</p>}
                {isSelected && detail && (
                  <div className="mt-2.5 space-y-1 border-t border-line pt-2.5 text-xs text-muted">
                    <p>
                      <span className="font-semibold text-ink">No-show : </span>
                      {detail.noShow}
                    </p>
                    <p>
                      <span className="font-semibold text-ink">Retard : </span>
                      {detail.retard}
                    </p>
                    <p>
                      <span className="font-semibold text-ink">Dépassement : </span>
                      {detail.depassement}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ConditionsTab({
  listing,
  onSaved,
  toast,
}: {
  listing: Listing;
  onSaved: (p: Partial<Listing>) => void;
  toast: ToastApi;
}) {
  const [validation, setValidation] = useState(!listing.instantBookEnabled);
  const [rcPro, setRcPro] = useState(listing.rcProRequired);
  const [deposit, setDeposit] = useState(listing.depositAmount ?? '');
  const [houseRules, setHouseRules] = useState(listing.houseRules ?? '');
  const [accessMethod, setAccessMethod] = useState(listing.accessMethod);
  const [accessCode, setAccessCode] = useState(listing.accessCode ?? '');
  const [wifiName, setWifiName] = useState(listing.wifiName ?? '');
  const [wifiPassword, setWifiPassword] = useState(listing.wifiPassword ?? '');
  const [contactPhone, setContactPhone] = useState(listing.contactPhone ?? '');
  const [saving, setSaving] = useState(false);

  async function saveToggle(patch: Record<string, unknown>) {
    try {
      const updated = await api.listings.update(listing.id, patch);
      onSaved(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.listings.update(listing.id, {
        depositAmount: deposit ? parseFloat(String(deposit)) : undefined,
        houseRules: houseRules || undefined,
        accessMethod,
        accessCode: accessCode || undefined,
        wifiName: wifiName || undefined,
        wifiPassword: wifiPassword || undefined,
        contactPhone: contactPhone || undefined,
      });
      onSaved(updated);
      toast.success('Conditions mises à jour');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <label className="flex items-start justify-between gap-3 border-b border-line py-3">
        <span>
          <span className="block text-sm font-semibold">Demande de validation manuelle</span>
          <span className="block text-xs text-muted">
            Le locataire doit décrire l&apos;activité et l&apos;usage prévus. Vous validez ou refusez
            chaque demande.
          </span>
        </span>
        <Toggle
          checked={validation}
          onChange={(v) => {
            setValidation(v);
            saveToggle({ instantBookEnabled: !v });
          }}
        />
      </label>

      <label className="flex items-start justify-between gap-3 border-b border-line py-3">
        <span>
          <span className="block text-sm font-semibold">Assurance RC Pro obligatoire</span>
          <span className="block text-xs text-muted">
            Le locataire doit certifier disposer d&apos;une assurance responsabilité civile
            professionnelle avant de réserver.
          </span>
        </span>
        <Toggle
          checked={rcPro}
          onChange={(v) => {
            setRcPro(v);
            saveToggle({ rcProRequired: v });
          }}
        />
      </label>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="label">Caution demandée (€)</label>
          <p className="hint mb-1.5">Laissez vide si aucune caution n&apos;est requise.</p>
          <input
            type="number"
            min="0"
            step="0.01"
            className="field"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            placeholder="0"
          />
        </div>

        <div>
          <label className="label">Règlement intérieur</label>
          <p className="hint mb-1.5">
            Affiché sur la fiche et à cocher obligatoirement par le locataire avant réservation.
          </p>
          <textarea
            rows={4}
            className="field resize-y"
            value={houseRules}
            onChange={(e) => setHouseRules(e.target.value)}
            placeholder="ex. Non-fumeur. Rangement demandé après usage. Toute dégradation sera facturée."
          />
        </div>

        <div className="border-t border-line pt-4">
          <h2 className="mb-3 text-sm font-bold">Accès (communiqué après paiement confirmé)</h2>
          <div className="space-y-3">
            <div>
              <label className="label">Méthode</label>
              <select
                className="field"
                value={accessMethod}
                onChange={(e) => setAccessMethod(e.target.value)}
              >
                {ACCESS_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {ACCESS_METHOD_LABEL[m]}
                  </option>
                ))}
              </select>
            </div>
            {(accessMethod === 'CODE' || accessMethod === 'KEYBOX') && (
              <div>
                <label className="label">Code</label>
                <input
                  type="text"
                  className="field"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="ex. 4812"
                />
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">
                  Réseau Wi-Fi <span className="font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  className="field"
                  value={wifiName}
                  onChange={(e) => setWifiName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">
                  Mot de passe Wi-Fi <span className="font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  className="field"
                  value={wifiPassword}
                  onChange={(e) => setWifiPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">
                Contact sur place <span className="font-normal">(optionnel)</span>
              </label>
              <input
                type="tel"
                className="field"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+33 6 …"
              />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
}
