
'use client';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import AddressAutocomplete from '@/components/address-autocomplete';
import { useEnabledListingTypes } from '@/lib/use-enabled-listing-types';
import { PROTOTYPE_TYPE_OPTIONS } from '@/lib/listing';
import { api } from '@/lib/api';
import type { Establishment } from '@/lib/types';
import type { GeoResult } from '@/lib/geo';
import type { SpaceDraft } from '@/lib/space-draft';
const ACCENT = '#2454FF', INK = '#14171A', GRAY = '#6B7280', BORDER = '#E7E7E7';
interface Props { context: 'host' | 'commercial'; onSubmit: (form: SpaceDraft) => Promise<void>; }
const DAY_OPTIONS = [
  { label: 'Lun', value: 1 }, { label: 'Mar', value: 2 }, { label: 'Mer', value: 3 },
  { label: 'Jeu', value: 4 }, { label: 'Ven', value: 5 }, { label: 'Sam', value: 6 }, { label: 'Dim', value: 0 },
];
const DURATION_OPTIONS = [
  { label: '1 heure', value: 60 }, { label: '1h30', value: 90 }, { label: '2 heures', value: 120 },
  { label: 'Demi-journée (4h)', value: 240 }, { label: 'Journée complète (8h)', value: 480 },
];
const NOTICE_OPTIONS = [
  { label: 'Aucun délai', value: 0 }, { label: '1 heure', value: 1 }, { label: '24 heures', value: 24 }, { label: '48 heures', value: 48 },
];
function establishmentGeo(e: Establishment): GeoResult | null {
  if (e.latitude == null || e.longitude == null) return null;
  return { id: e.id, label: `${e.addressLine1}, ${e.postalCode} ${e.city}`, addressLine1: e.addressLine1, city: e.city, postalCode: e.postalCode, latitude: e.latitude, longitude: e.longitude, context: '', kind: 'housenumber' };
}
export default function SpaceWizard({ onSubmit, context = "commercial" }: Props) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SpaceDraft>({
    geo: null,
    etablissement: "",
    nouvelEtablissement: "",
    hostName: "",
    hostEmail: "",
    hostPhone: "",
    nom: "",
    type: "Salle de réunion",
    adresse: "",
    capacite: "",
    superficie: "",
    prix: "",
    equipements: [],
    customTag: "",
    photos: [],
    titre: "",
    description: "",
    tags: [],
    faq: [],
    openDays: [1, 2, 3, 4, 5],
    openStartTime: "08:00",
    openEndTime: "19:00",
    minDurationMinutes: 60,
    minNoticeHours: 0,
  });
  const [genStatus, setGenStatus] = useState("idle");
  const uploading = false;
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const enabledTypes = useEnabledListingTypes();
  const spaceTypes = PROTOTYPE_TYPE_OPTIONS.filter((option) => enabledTypes.includes(option.value));
  const photosRef = useRef(form.photos);
  photosRef.current = form.photos;
  useEffect(() => () => photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), []);
  useEffect(() => {
    if (spaceTypes.length && !spaceTypes.some((option) => option.label === form.type)) setForm((f) => ({ ...f, type: spaceTypes[0].label }));
  }, [enabledTypes, form.type]);
  useEffect(() => {
    let active = true;
    setEstablishments([]);
    if (context !== "commercial" || !form.hostEmail.includes("@")) return;
    const timer = setTimeout(() => {
      api.commercial.establishmentsByHostEmail(form.hostEmail.trim()).then((items) => { if (active) setEstablishments(items); }).catch(() => {});
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [form.hostEmail, context]);
  const isHost = context === "host";

  function handlePhotoSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    setUploadError(null);
    if (files.some((file) => !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)) {
      setUploadError("Choisissez des images de moins de 10 Mo.");
      return;
    }
    if (form.photos.length + files.length > 12) {
      setUploadError("Vous pouvez ajouter jusqu'à 12 photos.");
      return;
    }
    setForm((f) => ({ ...f, photos: [...f.photos, ...files.map((file) => ({ id: crypto.randomUUID(), url: URL.createObjectURL(file), file }))] }));
  }

  function removePhoto(id: string) {
    const photo = form.photos.find((p) => p.id === id);
    if (photo) URL.revokeObjectURL(photo.url);
    setForm((f) => ({ ...f, photos: f.photos.filter((p) => p.id !== id) }));
  }
  const steps = isHost
    ? ["Essentiel", "Équipements", "Disponibilités", "Photos", "Récapitulatif", "Génération"]
    : ["Destinataire", "Essentiel", "Équipements", "Disponibilités", "Photos", "Récapitulatif", "Génération"];
  const current = steps[step];
  const baseAmenities = ["Wi-Fi", "Écran", "Visioconférence", "Café", "Climatisation", "Parking", "Accessible PMR"];

  const hostStepValid = isHost || ((form.etablissement || form.nouvelEtablissement.trim()) && form.hostName.trim() && (form.hostEmail.trim() || form.hostPhone.trim()));

  function toggleDay(day: number) {
    setForm((f) => ({ ...f, openDays: f.openDays.includes(day) ? f.openDays.filter((d) => d !== day) : [...f.openDays, day].sort() }));
  }

  function toggleAmenity(a: string) {
    setForm((f) => ({ ...f, equipements: f.equipements.includes(a) ? f.equipements.filter((x) => x !== a) : [...f.equipements, a] }));
  }

  function addCustomTag() {
    const t = form.customTag.trim();
    if (!t || form.equipements.includes(t)) return;
    setForm((f) => ({ ...f, equipements: [...f.equipements, t], customTag: "" }));
  }

  function removeAmenity(a: string) {
    setForm((f) => ({ ...f, equipements: f.equipements.filter((x) => x !== a) }));
  }

  function addFaqItem() {
    setForm((f) => ({ ...f, faq: [...f.faq, { q: "", r: "" }] }));
  }

  function removeFaqItem(i: number) {
    setForm((f) => ({ ...f, faq: f.faq.filter((_, idx) => idx !== i) }));
  }

  function generateFiche() {
    setGenStatus("loading");
    setTimeout(() => {
      setForm((f) => ({
        ...f,
        titre: `${f.nom || "Espace"}, ${f.type.toLowerCase()} au calme`,
        description: `${f.nom || "Cet espace"} vous accueille dans un espace de type ${f.type.toLowerCase()}${f.superficie ? " de " + f.superficie + " m²" : ""} pour ${f.capacite || "plusieurs"} personnes. Idéal pour vos activités professionnelles, vos rendez-vous ou vos séances de travail. ${f.equipements.length ? "Équipements inclus : " + f.equipements.join(", ") + "." : "Un cadre accueillant pour vos projets."}`,
        tags: [f.type, ...f.equipements.slice(0, 3)].filter(Boolean),
        faq: [
          { q: "Comment accéder à l'espace le jour J ?", r: "Les instructions d'accès (adresse précise, code, contact) sont envoyées automatiquement après réservation." },
          { q: "Le prix inclut-il les équipements listés ?", r: `Oui, ${f.equipements.length > 0 ? f.equipements.join(", ").toLowerCase() : "les équipements présentés"} sont inclus dans le tarif affiché.` },
        ],
      }));
      setGenStatus("done");
    }, 900);
  }

  function validate(currentStep: string): string | null {
    if (currentStep === "Destinataire") {
      if (!hostStepValid) return "Renseignez l'établissement, le nom du contact et au moins un moyen de le joindre.";
      if (form.hostEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.hostEmail.trim())) return "Renseignez une adresse email valide.";
      if (!form.hostEmail.trim() && form.hostPhone.replace(/\D/g, '').length < 8) return "Renseignez un numéro de téléphone valide.";
    }
    if (currentStep === "Essentiel") {
      if (form.nom.trim().length < 5) return "Le nom de l'espace doit comporter au moins 5 caractères.";
      if (!form.geo) return "Sélectionnez une adresse dans les suggestions.";
      if (!Number.isInteger(Number(form.capacite)) || Number(form.capacite) < 1 || Number(form.capacite) > 100) return "Indiquez une capacité entre 1 et 100 personnes.";
      if (!(Number(form.superficie.replace(',', '.')) > 0)) return "Indiquez une superficie valide.";
      if (!(Number(form.prix.replace(',', '.')) > 0)) return "Indiquez un prix horaire valide.";
    }
    if (currentStep === "Disponibilités") {
      if (!form.openDays.length) return "Sélectionnez au moins un jour de disponibilité.";
      if (form.openStartTime >= form.openEndTime) return "L'heure de fin doit être après l'heure de début.";
    }
    return null;
  }

  function next() {
    const message = validate(current);
    setError(message);
    if (!message) setStep(step + 1);
  }

  async function submit() {
    for (const name of steps) {
      const message = validate(name);
      if (message) { setError(message); setStep(steps.indexOf(name)); return; }
    }
    if (form.titre.trim().length < 5 || form.description.trim().length < 20) { setError("Renseignez un titre et une description complets."); return; }
    if (form.faq.some((item) => !item.q.trim() || !item.r.trim())) { setError("Complétez ou supprimez les questions et réponses vides."); return; }
    setSaving(true); setError(null);
    try { await onSubmit(form); } catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible. Réessayez."); } finally { setSaving(false); }
  }

  return (
    <div className="space-wizard" style={{ maxWidth: 640, margin: "0 auto", padding: "40px 32px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 6 }}>{isHost ? "Créer un nouvel espace" : "Créer une fiche pendant la visite"}</h1>
      <p style={{ fontSize: 13, color: GRAY, marginBottom: 24 }}>
        {isHost ? "Ce formulaire génère la fiche automatiquement à partir des informations essentielles." : "Formulaire rapide — l'hôte n'aura plus qu'à valider avant publication."}
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? ACCENT : BORDER }} />
        ))}
      </div>

      <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      {current === "Destinataire" && (
        <div>
          <div style={{ fontSize: 12, color: GRAY, marginBottom: 16 }}>
            Cette fiche sera envoyée pour validation à l'hôte que vous identifiez ici.
          </div>

          <label htmlFor="wizard--tablissement-existant" style={{ fontSize: 13, color: GRAY }}>Établissement existant</label>
          <select id="wizard--tablissement-existant"
            value={form.etablissement}
            onChange={(e) => {
              const establishment = establishments.find((item) => item.id === e.target.value);
              setForm({ ...form, etablissement: e.target.value, nouvelEtablissement: "", ...(establishment ? { adresse: `${establishment.addressLine1}, ${establishment.postalCode} ${establishment.city}`, geo: establishmentGeo(establishment) } : {}) });
            }}
            style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 12px" }}
          >
            <option value="">— Nouvel établissement —</option>
            {establishments.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>

          {!form.etablissement && (
            <>
              <label htmlFor="wizard-nom-du-nouvel-tablissement" style={{ fontSize: 13, color: GRAY }}>Nom du nouvel établissement</label>
              <input id="wizard-nom-du-nouvel-tablissement" value={form.nouvelEtablissement} onChange={(e) => setForm({ ...form, nouvelEtablissement: e.target.value })} placeholder="ex. Centre d'affaires Opéra" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 18px", boxSizing: "border-box" }} />
            </>
          )}

          <label htmlFor="wizard-nom-du-contact-h-te" style={{ fontSize: 13, color: GRAY }}>Nom du contact hôte</label>
          <input id="wizard-nom-du-contact-h-te" value={form.hostName} onChange={(e) => setForm({ ...form, hostName: e.target.value })} placeholder="Prénom et nom" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 18px", boxSizing: "border-box" }} />

          <div className="mkt-form-row-3" style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="wizard-email" style={{ fontSize: 13, color: GRAY }}>Email</label>
              <input id="wizard-email" value={form.hostEmail} onChange={(e) => setForm({ ...form, hostEmail: e.target.value, etablissement: "" })} placeholder="hote@exemple.com" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="wizard-t-l-phone" style={{ fontSize: 13, color: GRAY }}>Téléphone</label>
              <input id="wizard-t-l-phone" value={form.hostPhone} onChange={(e) => setForm({ ...form, hostPhone: e.target.value })} placeholder="+33 6 …" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />
            </div>
          </div>
          {!hostStepValid && (
            <div style={{ fontSize: 12, color: GRAY, marginTop: 10 }}>Renseignez l'établissement, le nom du contact et au moins un moyen de le joindre.</div>
          )}
        </div>
      )}

      {current === "Essentiel" && (
        <div>
          <label htmlFor="wizard-nom-de-l-espace" style={{ fontSize: 13, color: GRAY }}>Nom de l'espace</label>
          <input id="wizard-nom-de-l-espace" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="ex. Salle Atlas" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 18px", boxSizing: "border-box" }} />

          <label htmlFor="wizard-type-d-espace" style={{ fontSize: 13, color: GRAY }}>Type d'espace</label>
          <select id="wizard-type-d-espace" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 18px" }}>
            {spaceTypes.map((t) => (
              <option key={t.value} value={t.label}>{t.label}</option>
            ))}
          </select>

          <label htmlFor="wizard-address" style={{ fontSize: 13, color: GRAY }}>Adresse</label>
          <AddressAutocomplete
            id="wizard-address"
            value={form.adresse}
            className="mb-[18px] mt-1.5"
            onQueryChange={(value) => setForm((f) => ({ ...f, adresse: value, geo: null }))}
            onSelect={(geo) => setForm((f) => ({ ...f, geo, adresse: geo.label }))}
            placeholder="ex. 12 rue de la Paix, Paris"
          />

          <div className="mkt-form-row-3" style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="wizard-capacit-" style={{ fontSize: 13, color: GRAY }}>Capacité</label>
              <input id="wizard-capacit-" value={form.capacite} onChange={(e) => setForm({ ...form, capacite: e.target.value })} placeholder="Personnes" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="wizard-superficie-m-" style={{ fontSize: 13, color: GRAY }}>Superficie (m²)</label>
              <input id="wizard-superficie-m-" value={form.superficie} onChange={(e) => setForm({ ...form, superficie: e.target.value })} placeholder="m²" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="wizard-prix-h-" style={{ fontSize: 13, color: GRAY }}>Prix (€/h)</label>
              <input id="wizard-prix-h-" value={form.prix} onChange={(e) => setForm({ ...form, prix: e.target.value })} placeholder="€/h" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />
            </div>
          </div>
        </div>
      )}

      {current === "Équipements" && (
        <div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {[...new Set([...baseAmenities, ...form.equipements])].map((a) => {
              const active = form.equipements.includes(a);
              const isCustom = !baseAmenities.includes(a);
              return (
                <button type="button"
                  key={a}
                  onClick={() => toggleAmenity(a)}
                  style={{ border: `1px solid ${active ? INK : BORDER}`, background: active ? INK : "white", color: active ? "white" : INK, borderRadius: 999, padding: "8px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {a}
                  {isCustom && active && (
                    <span
                      onClick={(e) => { e.stopPropagation(); removeAmenity(a); }}
                      style={{ fontSize: 11, opacity: 0.8 }}
                    >
                      ✕
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <label htmlFor="wizard-equipment" style={{ fontSize: 13, color: GRAY }}>Ajouter un équipement non listé</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              id="wizard-equipment"
              value={form.customTag}
              onChange={(e) => setForm({ ...form, customTag: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
              placeholder="ex. Tableau blanc, Terrasse…"
              style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, boxSizing: "border-box" }}
            />
            <button type="button" onClick={addCustomTag} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "9px 16px", fontSize: 13, color: INK, cursor: "pointer" }}>
              Ajouter
            </button>
          </div>
        </div>
      )}

      {current === "Disponibilités" && (
        <div>
          <p style={{ fontSize: 13, color: GRAY, marginBottom: 16 }}>
            Ces réglages définissent les créneaux réservables par défaut. Vous pourrez toujours bloquer des créneaux ponctuels ensuite depuis le calendrier.
          </p>

          <div style={{ fontSize: 13, color: GRAY, marginBottom: 8 }}>Jours habituels de disponibilité</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
            {DAY_OPTIONS.map((d) => {
              const isActive = form.openDays.includes(d.value);
              return (
                <button type="button"
                  key={d.value}
                  onClick={() => toggleDay(d.value)}
                  aria-pressed={isActive}
                  style={{ border: `1px solid ${isActive ? INK : BORDER}`, background: isActive ? INK : "white", color: isActive ? "white" : INK, borderRadius: 8, width: 42, height: 36, fontSize: 12, cursor: "pointer" }}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          <div className="mkt-form-row-3" style={{ display: "flex", gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="wizard-heure-debut" style={{ fontSize: 13, color: GRAY }}>Heure de début</label>
              <input id="wizard-heure-debut" type="time" value={form.openStartTime} onChange={(e) => setForm({ ...form, openStartTime: e.target.value })} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="wizard-heure-fin" style={{ fontSize: 13, color: GRAY }}>Heure de fin</label>
              <input id="wizard-heure-fin" type="time" value={form.openEndTime} onChange={(e) => setForm({ ...form, openEndTime: e.target.value })} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />
            </div>
          </div>

          <div className="mkt-form-row-3" style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="wizard-duree-min" style={{ fontSize: 13, color: GRAY }}>Durée minimale de réservation</label>
              <select id="wizard-duree-min" value={form.minDurationMinutes} onChange={(e) => setForm({ ...form, minDurationMinutes: Number(e.target.value) })} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, margin: "6px 0" }}>
                {DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label htmlFor="wizard-delai-min" style={{ fontSize: 13, color: GRAY }}>Délai minimum avant réservation</label>
              <select id="wizard-delai-min" value={form.minNoticeHours} onChange={(e) => setForm({ ...form, minNoticeHours: Number(e.target.value) })} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, margin: "6px 0" }}>
                {NOTICE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {current === "Photos" && (
        <div>
          <p style={{ fontSize: 13, color: GRAY, marginBottom: 12 }}>
            Prenez au moins 3 photos depuis votre téléphone pendant la visite — envoyées et conservées avec la fiche.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
            {form.photos.map((p) => (
              <div key={p.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1" }}>
                <img src={p.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                <button type="button"
                  onClick={() => removePhoto(p.id)}
                  style={{ position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(0,0,0,0.6)", color: "white", fontSize: 11, cursor: "pointer", lineHeight: 1 }}
                  aria-label="Supprimer cette photo"
                >
                  ✕
                </button>
              </div>
            ))}

            <label
              style={{
                border: `1px dashed ${BORDER}`,
                borderRadius: 8,
                aspectRatio: "1",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: uploading ? BORDER : GRAY,
                cursor: uploading ? "not-allowed" : "pointer",
                textAlign: "center",
                padding: 8,
              }}
            >
              {uploading ? "Envoi…" : "+ Ajouter une photo"}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                disabled={uploading}
                onChange={handlePhotoSelect}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {uploadError && <div style={{ fontSize: 12, color: "#C0392B" }}>{uploadError}</div>}
          <div style={{ fontSize: 12, color: GRAY }}>{form.photos.length} photo(s) ajoutée(s)</div>
        </div>
      )}

      {current === "Récapitulatif" && (
        <div>
          {!isHost && (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>Destinataire de la validation</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{form.hostName || "Contact non renseigné"}</div>
              <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>{(establishments.find((e) => e.id === form.etablissement)?.name ?? form.nouvelEtablissement) || "Établissement non renseigné"}</div>
              <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>{[form.hostEmail, form.hostPhone].filter(Boolean).join(" · ")}</div>
            </div>
          )}
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: INK }}>{form.nom || "Nom non renseigné"}</div>
            <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>{form.type} · {form.adresse || "Adresse non renseignée"}</div>
            <div style={{ fontSize: 13, color: INK, marginTop: 8 }}>{form.capacite || "—"} personnes · {form.superficie || "—"} m² · {form.prix || "—"} €/h · {form.photos.length} photo(s) · {form.equipements.length} équipement(s)</div>
            <div style={{ fontSize: 13, color: GRAY, marginTop: 4 }}>
              {DAY_OPTIONS.filter((d) => form.openDays.includes(d.value)).map((d) => d.label).join(', ') || "Aucun jour"} · {form.openStartTime}–{form.openEndTime}
            </div>
          </div>
          <div style={{ fontSize: 12, color: GRAY, marginBottom: 16 }}>
            À l'étape suivante, le titre, la description, les tags et la FAQ seront générés automatiquement à partir de ces informations, et resteront modifiables avant l'envoi.
          </div>
        </div>
      )}

      {current === "Génération" && (
        <div>
          {genStatus === "idle" && (
            <button type="button" onClick={generateFiche} style={{ width: "100%", border: "none", background: ACCENT, color: "white", borderRadius: 8, padding: "12px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Générer la fiche automatiquement
            </button>
          )}
          {genStatus === "loading" && (
            <div style={{ fontSize: 13, color: GRAY, textAlign: "center", padding: "20px 0" }}>Génération en cours…</div>
          )}
          {genStatus === "done" && (
            <div>
              <label htmlFor="wizard-titre" style={{ fontSize: 13, color: GRAY }}>Titre</label>
              <input id="wizard-titre" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 16px", boxSizing: "border-box" }} />

              <label htmlFor="wizard-description" style={{ fontSize: 13, color: GRAY }}>Description</label>
              <textarea id="wizard-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, margin: "6px 0 16px", boxSizing: "border-box", fontFamily: "inherit" }} />

              <label style={{ fontSize: 13, color: GRAY }}>Tags</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 16px" }}>
                {form.tags.map((t) => (
                  <span key={t} style={{ fontSize: 12, color: INK, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "5px 10px" }}>{t}</span>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 13, color: GRAY }}>FAQ</label>
                <button type="button" onClick={addFaqItem} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: INK, cursor: "pointer" }}>
                  + Ajouter une question
                </button>
              </div>
              {form.faq.map((f, i) => (
                <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, marginTop: 8, position: "relative" }}>
                  <button type="button"
                    onClick={() => removeFaqItem(i)}
                    style={{ position: "absolute", top: 8, right: 8, border: "none", background: "transparent", color: GRAY, fontSize: 12, cursor: "pointer" }}
                  >
                    ✕
                  </button>
                  <input
                    value={f.q}
                    onChange={(e) => {
                      const faq = [...form.faq];
                      faq[i] = { ...faq[i], q: e.target.value };
                      setForm({ ...form, faq });
                    }}
                    placeholder="Question"
                    style={{ display: "block", width: "90%", border: "none", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 6, padding: 0, boxSizing: "border-box" }}
                  />
                  <textarea
                    value={f.r}
                    onChange={(e) => {
                      const faq = [...form.faq];
                      faq[i] = { ...faq[i], r: e.target.value };
                      setForm({ ...form, faq });
                    }}
                    placeholder="Réponse"
                    rows={2}
                    style={{ display: "block", width: "100%", border: "none", fontSize: 12, color: GRAY, padding: 0, boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                </div>
              ))}
              <button type="button" onClick={generateFiche} style={{ marginTop: 12, border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: INK, cursor: "pointer" }}>
                Régénérer
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" style={{ color: "#C0392B", fontSize: 13, marginTop: 16 }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
        <button type="button" disabled={step === 0} onClick={() => { setStep(step - 1); setError(null); }} style={{ border: `1px solid ${BORDER}`, background: "white", color: step === 0 ? BORDER : INK, borderRadius: 8, padding: "10px 18px", fontSize: 13, cursor: step === 0 ? "not-allowed" : "pointer" }}>
          Précédent
        </button>
        {step < steps.length - 1 ? (
          <button type="button"
            disabled={current === "Destinataire" && !hostStepValid}
            onClick={next}
            style={{
              border: "none",
              background: current === "Destinataire" && !hostStepValid ? "#F1F1EF" : ACCENT,
              color: current === "Destinataire" && !hostStepValid ? GRAY : "white",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: current === "Destinataire" && !hostStepValid ? "not-allowed" : "pointer",
            }}
          >
            Suivant
          </button>
        ) : (
          <button type="button" disabled={genStatus !== "done"} onClick={submit} style={{ border: "none", background: genStatus === "done" ? ACCENT : "#F1F1EF", color: genStatus === "done" ? "white" : GRAY, borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: genStatus === "done" ? "pointer" : "not-allowed" }}>
            {saving ? "Enregistrement…" : isHost ? "Publier l'espace" : "Envoyer à l'hôte pour validation"}
          </button>
        )}
      </div>
      </fieldset>
    </div>
  );
}
