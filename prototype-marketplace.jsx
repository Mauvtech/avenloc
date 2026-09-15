import { useState } from "react";

const ACCENT = "#2454FF";
const INK = "#14171A";
const GRAY = "#6B7280";
const BORDER = "#E7E7E7";
const AMBER = "#B45309";
const AMBER_BG = "#FFF4E5";

const SPACE_TYPES = [
  "Salle de réunion",
  "Bureau privé",
  "Salle de formation",
  "Fauteuil vacant",
  "Boutique",
  "Cabinet",
  "Restaurant",
  "Studio créatif",
  "Atelier",
  "Salle événementiel",
];

const MOCK_SPACES = [
  {
    id: "space_1",
    nom: "Salle Atlas",
    typeEspace: "Salle de réunion",
    adresse: "12 rue de la Paix, 75002 Paris",
    capacite: 8,
    superficie: 25,
    prix: 40,
    verified: true,
    verifiedAt: "1 juin 2026",
    status: "publié",
    ratingAverage: 4.7,
    reviewsCount: 32,
    horaires: "Lun–Ven, 8h–19h",
    transports: "Métro Opéra à 3 min",
    parking: true,
    accessibilite: true,
    amenities: ["Wi-Fi", "Écran 55\"", "Visioconférence", "Café inclus", "Climatisation"],
    regles: "Non-fumeur. Silence respecté après 18h.",
    politiqueAnnulation: "Flexible",
    validationActivite: true,
    caution: 200,
    rcProObligatoire: true,
    reglementInterieur: "Non-fumeur. Interdiction de déplacer le mobilier fixe. Nettoyage sommaire demandé après usage. Toute dégradation sera facturée sur la caution.",
    accessMethod: "serrure",
    faq: [
      { q: "Y a-t-il un vidéoprojecteur ?", r: "Non, la salle est équipée d'un écran avec câble HDMI et adaptateur USB-C fournis." },
      { q: "Le café est-il inclus dans le prix ?", r: "Oui, une machine à café en libre-service est à disposition dans la salle." },
    ],
  },
  {
    id: "space_2",
    nom: "Bureau 101",
    typeEspace: "Bureau privé",
    adresse: "8 avenue Foch, 75116 Paris",
    capacite: 2,
    superficie: 12,
    prix: 22,
    verified: true,
    verifiedAt: "14 mai 2026",
    status: "publié",
    ratingAverage: 4.9,
    reviewsCount: 18,
    horaires: "Lun–Sam, 7h–21h",
    transports: "RER Étoile à 6 min",
    parking: false,
    accessibilite: false,
    amenities: ["Wi-Fi", "Bureau ajustable", "Casier sécurisé"],
    regles: "Aucun visiteur externe sans accord préalable.",
    politiqueAnnulation: "Stricte",
    validationActivite: false,
    caution: null,
    rcProObligatoire: false,
    reglementInterieur: "Aucun visiteur externe sans accord préalable. Respect des horaires d'accès.",
    accessMethod: "code",
    faq: [{ q: "Le bureau est-il fermé à clé ?", r: "Oui, un code d'accès temporaire vous est envoyé après réservation." }],
  },
  {
    id: "space_3",
    nom: "Salle de formation Nord",
    typeEspace: "Salle de formation",
    adresse: "45 boulevard Voltaire, 75011 Paris",
    capacite: 20,
    superficie: 60,
    prix: 90,
    verified: false,
    status: "publié",
    ratingAverage: 4.4,
    reviewsCount: 9,
    horaires: "Lun–Ven, 9h–18h",
    transports: "Métro Voltaire à 2 min",
    parking: true,
    accessibilite: true,
    amenities: ["Wi-Fi", "Vidéoprojecteur", "Paperboard", "Tables modulables"],
    regles: "Rangement des tables demandé en fin de session.",
    politiqueAnnulation: "Modérée",
    validationActivite: true,
    caution: 300,
    rcProObligatoire: true,
    reglementInterieur: "Le formateur est responsable du rangement des tables et du matériel utilisé pendant la session.",
    accessMethod: "boitecles",
    faq: [],
  },
  {
    id: "space_4",
    nom: "Bureau 102",
    typeEspace: "Bureau privé",
    adresse: "12 rue de la Paix, 75002 Paris",
    capacite: 4,
    superficie: 16,
    prix: 28,
    verified: true,
    status: "publié",
    ratingAverage: 4.6,
    reviewsCount: 11,
    horaires: "Lun–Ven, 8h–19h",
    transports: "Métro Opéra à 3 min",
    parking: true,
    accessibilite: true,
    amenities: ["Wi-Fi", "Écran", "Café inclus"],
    regles: "Non-fumeur.",
    politiqueAnnulation: "Flexible",
    validationActivite: false,
    caution: null,
    rcProObligatoire: false,
    reglementInterieur: "Non-fumeur. Respect de la tranquillité des bureaux voisins.",
    accessMethod: "code",
    faq: [],
  },
  {
    id: "space_6",
    nom: "Studio Lumière",
    typeEspace: "Studio créatif",
    adresse: "22 rue Oberkampf, 75011 Paris",
    capacite: 6,
    superficie: 45,
    prix: 55,
    verified: true,
    status: "publié",
    ratingAverage: 4.8,
    reviewsCount: 14,
    horaires: "Lun–Dim, 8h–22h",
    transports: "Métro Parmentier à 4 min",
    parking: false,
    accessibilite: true,
    amenities: ["Wi-Fi", "Fond studio", "Éclairage photo", "Prises multiples"],
    regles: "Rangement du matériel demandé en fin de session.",
    politiqueAnnulation: "Modérée",
    validationActivite: true,
    caution: 150,
    rcProObligatoire: true,
    reglementInterieur: "Matériel photo/vidéo à manipuler avec précaution. Fond studio à ne pas découper ni salir.",
    accessMethod: "qr",
    faq: [],
  },
  {
    id: "space_7",
    nom: "Cabinet Bellevue",
    typeEspace: "Cabinet",
    adresse: "5 rue de Rivoli, 75004 Paris",
    capacite: 3,
    superficie: 18,
    prix: 35,
    verified: true,
    status: "publié",
    ratingAverage: 4.9,
    reviewsCount: 22,
    horaires: "Lun–Ven, 9h–19h",
    transports: "Métro Hôtel de Ville à 2 min",
    parking: false,
    accessibilite: true,
    amenities: ["Wi-Fi", "Salle d'attente", "Point d'eau"],
    regles: "Discrétion requise, silence dans les parties communes.",
    politiqueAnnulation: "Stricte",
    validationActivite: true,
    caution: null,
    rcProObligatoire: true,
    reglementInterieur: "Discrétion professionnelle requise. Salle d'attente à laisser rangée entre deux rendez-vous.",
    accessMethod: "accueil",
    faq: [],
  },
  {
    id: "space_8",
    nom: "L'Atelier Marais",
    typeEspace: "Atelier",
    adresse: "9 rue des Rosiers, 75004 Paris",
    capacite: 10,
    superficie: 70,
    prix: 65,
    verified: false,
    status: "publié",
    ratingAverage: 4.5,
    reviewsCount: 7,
    horaires: "Lun–Sam, 9h–20h",
    transports: "Métro Saint-Paul à 3 min",
    parking: false,
    accessibilite: false,
    amenities: ["Wi-Fi", "Établis", "Outillage partagé", "Ventilation"],
    regles: "Équipements de sécurité fournis, à porter obligatoirement.",
    politiqueAnnulation: "Flexible",
    validationActivite: true,
    caution: 250,
    rcProObligatoire: true,
    reglementInterieur: "Port des équipements de sécurité obligatoire. Utilisation de l'outillage aux risques de l'utilisateur.",
    accessMethod: "boitecles",
    faq: [],
  },
];

const MOCK_BOOKINGS = [
  { id: "b1", space: "Salle Atlas", date: "14 sept.", dateISO: "2026-09-14", heure: "14h–16h", montant: 80, statut: "confirmée", paiement: "payé", categorie: "à venir" },
  { id: "b2", space: "Bureau 101", date: "14 sept.", dateISO: "2026-09-14", heure: "9h–13h", montant: 88, statut: "confirmée", paiement: "payé", categorie: "à venir" },
  { id: "b3", space: "Bureau 102", date: "13 sept.", dateISO: "2026-09-13", heure: "10h–11h", montant: 28, statut: "terminée", paiement: "payé", categorie: "passée" },
  { id: "b4", space: "Salle Atlas", date: "16 sept.", dateISO: "2026-09-16", heure: "9h–10h", montant: 40, statut: "en attente", paiement: "en attente", categorie: "à venir" },
  { id: "b5", space: "Studio Lumière", date: "18 sept.", dateISO: "2026-09-18", heure: "11h–13h", montant: 110, statut: "confirmée", paiement: "payé", categorie: "à venir" },
  { id: "b6", space: "Cabinet Bellevue", date: "21 sept.", dateISO: "2026-09-21", heure: "15h–16h", montant: 35, statut: "confirmée", paiement: "payé", categorie: "à venir" },
  { id: "b7", space: "Bureau 101", date: "Aujourd'hui", dateISO: "2026-09-13", heure: "13h–15h", montant: 44, statut: "confirmée", paiement: "payé", categorie: "en cours" },
  { id: "b8", space: "Salle Atlas", date: "11 sept.", dateISO: "2026-09-11", heure: "9h–13h", montant: 160, statut: "terminée", paiement: "payé", categorie: "passée", caution: 200 },
];

const MOCK_CLIENT_BOOKINGS = [
  { id: "cb1", space: "Salle Atlas", adresse: "12 rue de la Paix, 75002 Paris", date: "Aujourd'hui", heure: "14h00–16h00", montant: 80, categorie: "à venir", avisLaisse: false },
  { id: "cb2", space: "Bureau 101", adresse: "8 avenue Foch, 75116 Paris", date: "Maintenant", heure: "13h00–15h00", montant: 44, categorie: "en cours", avisLaisse: false },
  {
    id: "cb3",
    space: "Salle de formation Nord",
    adresse: "45 boulevard Voltaire, 75011 Paris",
    date: "2 sept.",
    heure: "9h00–17h00",
    montant: 90,
    categorie: "passée",
    avisLaisse: false,
    depositClaim: {
      montant: 150,
      motif: "Dégradation",
      description: "Une table modulable a été retrouvée fissurée après votre créneau, avec photos à l'appui.",
      status: "pending",
    },
  },
  { id: "cb4", space: "Bureau 102", adresse: "12 rue de la Paix, 75002 Paris", date: "28 août", heure: "10h00–11h00", montant: 28, categorie: "passée", avisLaisse: true },
];

const CANCELLATION_POLICIES = [
  {
    nom: "Flexible",
    detail: "Remboursement intégral jusqu'à 24h avant. Aucun remboursement après.",
    noShow: "Facturation intégrale de la réservation.",
    retard: "Créneau raccourci d'autant, sans remboursement de la portion manquée.",
    depassement: "15 € par tranche de 15 minutes au-delà du créneau réservé.",
  },
  {
    nom: "Modérée",
    detail: "Remboursement intégral jusqu'à 3 jours avant, 50 % jusqu'à 24h avant.",
    noShow: "Facturation à 100 %, avis automatique à l'hôte.",
    retard: "Tolérance de 15 min, puis créneau raccourci d'autant.",
    depassement: "20 € par tranche de 15 minutes, prélevés sur la caution si applicable.",
  },
  {
    nom: "Stricte",
    detail: "Remboursement à 50 % jusqu'à 7 jours avant. Aucun remboursement après.",
    noShow: "Facturation intégrale + signalement pour vérification de compte.",
    retard: "Aucune tolérance, créneau raccourci dès la première minute.",
    depassement: "30 € par tranche de 15 minutes, réservation suivante prioritaire.",
  },
];

function generateSlots() {
  const slots = [];
  for (let h = 8; h < 19; h++) slots.push({ start: h, mode: h === 14 ? "request" : "instant" });
  return slots;
}

function Photo({ ratio = "4/3" }) {
  return <div style={{ background: "#F1F1EF", borderRadius: 8, width: "100%", aspectRatio: ratio }} />;
}

function VerifiedBadge() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: INK, fontWeight: 500 }}>
      <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
        <circle cx="5" cy="5" r="5" fill={ACCENT} />
        <path d="M2.8 5.1L4.2 6.5L7.2 3.3" stroke="white" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Vérifié
    </span>
  );
}

function Pill({ text, bg, color }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 500, background: bg, color: color, borderRadius: 999, padding: "4px 10px" }}>
      {text}
    </span>
  );
}

function TopNav({ mode, setMode, onLogoClick }) {
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}`, background: "white" }}>
      <div className="mkt-topnav-inner" style={{ maxWidth: 1120, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={onLogoClick} style={{ display: "flex", alignItems: "baseline", gap: 6, cursor: "pointer" }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: INK, letterSpacing: "-0.01em" }}>Sppot</span>
          <span style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 13, fontWeight: 500, color: GRAY }}>by Aven</span>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#F5F5F4", borderRadius: 8, padding: 3 }}>
          {["client", "hote", "commercial"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                border: "none",
                background: mode === m ? "white" : "transparent",
                boxShadow: mode === m ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                borderRadius: 6,
                padding: "7px 14px",
                fontSize: 13,
                fontWeight: 500,
                color: mode === m ? INK : GRAY,
                cursor: "pointer",
              }}
            >
              {m === "client" ? "Espace client" : m === "hote" ? "Espace hôte" : "Commercial"}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ roleLabel, onSuccess }) {
  const [tab, setTab] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const canSubmit =
    tab === "login"
      ? email.trim() && password.length >= 6
      : name.trim() && email.trim() && password.length >= 6 && password === confirm;

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", padding: "32px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 6 }}>{roleLabel}</h1>
      <p style={{ fontSize: 13, color: GRAY, marginBottom: 24 }}>Connectez-vous ou créez un compte pour accéder à cet espace.</p>

      <div style={{ display: "flex", gap: 4, background: "#F5F5F4", borderRadius: 8, padding: 3, marginBottom: 24, width: "fit-content" }}>
        {["login", "signup"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ border: "none", background: tab === t ? "white" : "transparent", boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.06)" : "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500, color: tab === t ? INK : GRAY, cursor: "pointer" }}
          >
            {t === "login" ? "Se connecter" : "Créer un compte"}
          </button>
        ))}
      </div>

      <button
        onClick={onSuccess}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "11px 0", fontSize: 14, fontWeight: 500, color: INK, cursor: "pointer", marginBottom: 20 }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
        Continuer avec Google
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
        <span style={{ fontSize: 12, color: GRAY }}>ou</span>
        <div style={{ flex: 1, height: 1, background: BORDER }} />
      </div>

      {tab === "signup" && (
        <>
          <label style={{ fontSize: 13, color: GRAY }}>Nom</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 16px", boxSizing: "border-box" }} />
        </>
      )}

      <label style={{ fontSize: 13, color: GRAY }}>Email</label>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 16px", boxSizing: "border-box" }} />

      <label style={{ fontSize: 13, color: GRAY }}>Mot de passe</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 16px", boxSizing: "border-box" }} />

      {tab === "signup" && (
        <>
          <label style={{ fontSize: 13, color: GRAY }}>Confirmer le mot de passe</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />
        </>
      )}

      <button
        disabled={!canSubmit}
        onClick={onSuccess}
        style={{ width: "100%", marginTop: 20, border: "none", background: canSubmit ? ACCENT : "#F1F1EF", color: canSubmit ? "white" : GRAY, borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}
      >
        {tab === "login" ? "Se connecter" : "Créer mon compte"}
      </button>
    </div>
  );
}

/* ---------------- CLIENT ---------------- */

function DateField({ date, setDate }) {
  const [open, setOpen] = useState(false);
  const label = date
    ? new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
    : "";

  return (
    <div style={{ position: "relative", flex: 1, padding: "8px 20px", borderRight: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: 11, color: GRAY, fontWeight: 500 }}>Quand</div>
      <div onClick={() => setOpen(!open)} style={{ fontSize: 14, color: INK, cursor: "pointer", padding: "2px 0", minHeight: 20 }}>
        {label}
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 20 }}>
          <MiniCalendar
            value={date}
            onChange={(d) => {
              setDate(d);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function TypeField({ spaceType, setSpaceType, allTypes }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative", flex: 1, padding: "8px 20px" }}>
      <div style={{ fontSize: 11, color: GRAY, fontWeight: 500 }}>Type d'espace</div>
      <div onClick={() => setOpen(!open)} style={{ fontSize: 14, color: INK, cursor: "pointer", padding: "2px 0", minHeight: 20 }}>
        {spaceType}
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 20, background: "white", border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", overflow: "hidden", maxHeight: 280, overflowY: "auto" }}>
          <button
            onClick={() => { setSpaceType(""); setOpen(false); }}
            style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: spaceType === "" ? "#F5F5F4" : "white", padding: "10px 16px", fontSize: 13, color: INK, cursor: "pointer" }}
          >
            Indifférent
          </button>
          {allTypes.map((t) => (
            <button
              key={t}
              onClick={() => { setSpaceType(t); setOpen(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: spaceType === t ? "#F5F5F4" : "white", padding: "10px 16px", fontSize: 13, color: INK, cursor: "pointer" }}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchBar({ query, setQuery, date, setDate, spaceType, setSpaceType, allTypes }) {
  return (
    <div className="mkt-searchbar" style={{ display: "flex", alignItems: "stretch", border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div style={{ flex: 1, padding: "8px 20px", borderRight: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 11, color: GRAY, fontWeight: 500 }}>Où</div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ border: "none", outline: "none", fontSize: 14, color: INK, width: "100%", padding: "2px 0", fontFamily: "inherit" }}
        />
      </div>
      <DateField date={date} setDate={setDate} />
      <TypeField spaceType={spaceType} setSpaceType={setSpaceType} allTypes={allTypes} />
      <button style={{ background: ACCENT, color: "white", border: "none", padding: "0 26px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        Rechercher
      </button>
    </div>
  );
}

function FilterChips({ filters, setFilters, allAmenities, maxPricePossible }) {
  const [open, setOpen] = useState(null);
  const sliderValue = filters.maxPrice ?? maxPricePossible;

  function toggleAmenity(a) {
    setFilters((f) => ({ ...f, amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a] }));
  }

  const chips = [
    { key: "capacite", label: filters.capacity ? `${filters.capacity}+ personnes` : "Capacité" },
    { key: "prix", label: filters.maxPrice ? `Jusqu'à ${filters.maxPrice} €` : "Prix" },
    { key: "amenities", label: filters.amenities.length ? `Équipements · ${filters.amenities.length}` : "Équipements" },
    { key: "instant", label: "Réservation instantanée", toggle: true },
  ];

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {chips.map((c) => {
          const isActive = c.toggle ? filters.instant : open === c.key || (c.key === "capacite" && filters.capacity) || (c.key === "prix" && filters.maxPrice) || (c.key === "amenities" && filters.amenities.length);
          return (
            <button
              key={c.key}
              onClick={() => (c.toggle ? setFilters((f) => ({ ...f, instant: !f.instant })) : setOpen(open === c.key ? null : c.key))}
              style={{ border: `1px solid ${isActive ? INK : BORDER}`, background: isActive ? INK : "white", color: isActive ? "white" : INK, borderRadius: 999, padding: "7px 14px", fontSize: 13, cursor: "pointer" }}
            >
              {c.label}
            </button>
          );
        })}
        {(filters.capacity > 0 || filters.maxPrice || filters.amenities.length > 0 || filters.instant) && (
          <button
            onClick={() => setFilters({ capacity: 0, maxPrice: null, amenities: [], instant: false })}
            style={{ border: "none", background: "transparent", color: GRAY, fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {open === "capacite" && (
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {[1, 2, 4, 6, 10].map((c) => (
            <button
              key={c}
              onClick={() => setFilters((f) => ({ ...f, capacity: f.capacity === c ? 0 : c }))}
              style={{ border: `1px solid ${filters.capacity === c ? INK : BORDER}`, background: filters.capacity === c ? INK : "white", color: filters.capacity === c ? "white" : INK, borderRadius: 999, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}
            >
              {c}+ personnes
            </button>
          ))}
        </div>
      )}

      {open === "prix" && (
        <div style={{ marginTop: 12, maxWidth: 320 }}>
          <div style={{ fontSize: 13, color: INK, marginBottom: 8 }}>
            Jusqu'à <strong>{sliderValue} €</strong> / heure
          </div>
          <input
            type="range"
            min={10}
            max={maxPricePossible}
            step={5}
            value={sliderValue}
            onChange={(e) => {
              const v = Number(e.target.value);
              setFilters((f) => ({ ...f, maxPrice: v >= maxPricePossible ? null : v }));
            }}
            style={{ width: "100%", accentColor: INK }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: GRAY, marginTop: 2 }}>
            <span>10 €</span>
            <span>{maxPricePossible} €</span>
          </div>
        </div>
      )}

      {open === "amenities" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {allAmenities.map((a) => {
            const active = filters.amenities.includes(a);
            return (
              <button key={a} onClick={() => toggleAmenity(a)} style={{ border: `1px solid ${active ? INK : BORDER}`, background: active ? INK : "white", color: active ? "white" : INK, borderRadius: 999, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>
                {a}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SpaceCard({ space, onClick }) {
  return (
    <div onClick={onClick} style={{ cursor: "pointer" }}>
      <Photo />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{space.nom}</div>
        {space.ratingAverage && <div style={{ fontSize: 13, color: INK }}>★ {space.ratingAverage}</div>}
      </div>
      <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>{space.typeEspace} · {space.capacite} pers.</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
        <div style={{ fontSize: 14, color: INK }}>
          <span style={{ fontWeight: 600 }}>{space.prix} €</span>
          <span style={{ color: GRAY }}> / heure</span>
        </div>
        {space.verified && <VerifiedBadge />}
      </div>
    </div>
  );
}

function ClientSearch({ onSelectSpace, spaces }) {
  const [query, setQuery] = useState("");
  const [date, setDate] = useState("");
  const [spaceType, setSpaceType] = useState("");
  const [filters, setFilters] = useState({ capacity: 0, maxPrice: null, amenities: [], instant: false });

  const published = spaces.filter((s) => s.status === "publié");
  const allTypes = [...new Set(published.map((s) => s.typeEspace))];
  const allAmenities = [...new Set(published.flatMap((s) => s.amenities))];
  const maxPricePossible = Math.max(10, ...published.map((s) => s.prix), 100);

  const results = published.filter((s) => {
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      if (!s.nom.toLowerCase().includes(q) && !s.adresse.toLowerCase().includes(q) && !s.typeEspace.toLowerCase().includes(q)) return false;
    }
    if (spaceType && s.typeEspace !== spaceType) return false;
    if (filters.capacity && s.capacite < filters.capacity) return false;
    if (filters.maxPrice && s.prix > filters.maxPrice) return false;
    if (filters.amenities.length && !filters.amenities.every((a) => s.amenities.includes(a))) return false;
    if (filters.instant && s.validationActivite) return false;
    return true;
  });

  return (
    <div className="mkt-page-pad" style={{ maxWidth: 1120, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: INK, marginBottom: 20, letterSpacing: "-0.01em" }}>Trouvez votre espace de travail</h1>
      <SearchBar query={query} setQuery={setQuery} date={date} setDate={setDate} spaceType={spaceType} setSpaceType={setSpaceType} allTypes={allTypes} />
      <FilterChips filters={filters} setFilters={setFilters} allAmenities={allAmenities} maxPricePossible={maxPricePossible} />
      <div style={{ fontSize: 13, color: GRAY, margin: "28px 0 16px" }}>
        {results.length} espace{results.length !== 1 ? "s" : ""} disponible{results.length !== 1 ? "s" : ""}
      </div>
      {results.length === 0 ? (
        <div style={{ fontSize: 13, color: GRAY, padding: "40px 0", textAlign: "center" }}>Aucun espace ne correspond à ces critères.</div>
      ) : (
        <div className="mkt-grid-cards" style={{ display: "grid", gap: 24 }}>
          {results.map((s) => (
            <SpaceCard key={s.id} space={s} onClick={() => onSelectSpace(s)} />
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 14 }}>
      <div style={{ width: 130, color: GRAY, flexShrink: 0 }}>{label}</div>
      <div style={{ color: INK }}>{value}</div>
    </div>
  );
}

function Crumbs({ items }) {
  return (
    <div style={{ fontSize: 13, color: GRAY, marginBottom: 20 }}>
      {items.map((c, i) => (
        <span key={i}>
          {i > 0 && <span style={{ margin: "0 6px" }}>/</span>}
          <span onClick={c.onClick} style={{ cursor: c.onClick ? "pointer" : "default", color: c.onClick ? ACCENT : GRAY }}>
            {c.label}
          </span>
        </span>
      ))}
    </div>
  );
}

function MessageButton({ label = "Contacter l'hôte" }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: INK, cursor: "pointer", width: "100%" }}>
        {label}
      </button>
      {open && (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 14, marginTop: 10 }}>
          <div style={{ fontSize: 12, color: GRAY, marginBottom: 8 }}>
            La messagerie sert aux demandes particulières ou aux problèmes — pas nécessaire pour réserver.
          </div>
          <textarea placeholder="Votre message…" rows={3} style={{ width: "100%", border: `1px solid ${BORDER}`, borderRadius: 6, padding: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
          <button style={{ marginTop: 8, background: INK, color: "white", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>Envoyer</button>
        </div>
      )}
    </div>
  );
}

function ClientDetail({ space, onBack, onReserve }) {
  return (
    <div className="mkt-page-pad" style={{ maxWidth: 1120, margin: "0 auto" }}>
      <Crumbs items={[{ label: "Espaces", onClick: onBack }, { label: space.nom }]} />
      <div className="mkt-two-col" style={{ display: "grid", gap: 48 }}>
        <div>
          <Photo ratio="16/8" />
          <div className="mkt-photo-thumbs" style={{ display: "grid", gap: 8, marginTop: 8 }}>
            <Photo /> <Photo /> <Photo /> <Photo />
          </div>
          <div style={{ marginTop: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 700, color: INK, margin: 0 }}>{space.nom}</h1>
              </div>
              {space.verified && <VerifiedBadge />}
            </div>
            <div style={{ display: "flex", gap: 20, marginTop: 16, fontSize: 14, color: GRAY }}>
              <span>{space.capacite} personnes</span>
              <span>{space.superficie} m²</span>
              {space.ratingAverage && <span>★ {space.ratingAverage} ({space.reviewsCount} avis)</span>}
            </div>
            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 10 }}>Équipements</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {space.amenities.map((a) => (
                  <span key={a} style={{ fontSize: 13, color: INK, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "6px 12px" }}>{a}</span>
                ))}
              </div>
            </div>
            <div style={{ marginTop: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 6 }}>Informations pratiques</div>
              <InfoRow label="Horaires" value={space.horaires} />
              <InfoRow label="Transports" value={space.transports} />
              <InfoRow label="Parking" value={space.parking ? "Disponible sur place" : null} />
              <InfoRow label="Accessibilité" value={space.accessibilite ? "Accès PMR" : null} />
              <InfoRow label="Règles" value={space.regles} />
              <InfoRow label="Méthode d'accès" value={{ code: "Code temporaire", qr: "QR code", boitecles: "Boîte à clés", serrure: "Serrure connectée", accueil: "Accueil sur place" }[space.accessMethod] || "Code temporaire"} />
              <InfoRow label="Politique d'annulation" value={space.politiqueAnnulation} />
              <InfoRow label="Caution" value={space.caution ? `${space.caution} € (empreinte bancaire, restituée après usage)` : "Aucune"} />
              <InfoRow label="Assurance RC Pro" value={space.rcProObligatoire ? "Obligatoire" : "Non requise"} />
              <InfoRow label="Validation de la demande" value={space.validationActivite ? "L'hôte valide chaque demande selon l'activité prévue" : "Réservation instantanée"} />
            </div>
            {(() => {
              const p = CANCELLATION_POLICIES.find((pol) => pol.nom === space.politiqueAnnulation);
              if (!p) return null;
              return (
                <div style={{ marginTop: 16 }}>
                  <details>
                    <summary style={{ fontSize: 13, color: INK, cursor: "pointer" }}>Détail no-show, retard et dépassement</summary>
                    <div style={{ marginTop: 8 }}>
                      <InfoRow label="No-show" value={p.noShow} />
                      <InfoRow label="Retard" value={p.retard} />
                      <InfoRow label="Dépassement" value={p.depassement} />
                    </div>
                  </details>
                </div>
              );
            })()}
            {space.reglementInterieur && (
              <div style={{ marginTop: 20 }}>
                <details>
                  <summary style={{ fontSize: 13, color: INK, cursor: "pointer" }}>Voir le règlement intérieur</summary>
                  <p style={{ fontSize: 13, color: GRAY, marginTop: 8 }}>{space.reglementInterieur}</p>
                </details>
              </div>
            )}
            {space.faq.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 10 }}>Questions fréquentes</div>
                {space.faq.map((f, i) => (
                  <details key={i} style={{ borderBottom: `1px solid ${BORDER}`, padding: "10px 0" }}>
                    <summary style={{ fontSize: 14, color: INK, cursor: "pointer" }}>{f.q}</summary>
                    <p style={{ fontSize: 13, color: GRAY, marginTop: 8 }}>{f.r}</p>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22, position: "sticky", top: 20 }}>
            <div style={{ fontSize: 20, color: INK, fontWeight: 700 }}>
              {space.prix} € <span style={{ fontSize: 13, color: GRAY, fontWeight: 400 }}>/ heure</span>
            </div>
            <div style={{ fontSize: 13, color: GRAY, marginTop: 4, marginBottom: 18 }}>Réservation instantanée disponible</div>
            <button onClick={onReserve} style={{ width: "100%", background: ACCENT, color: "white", border: "none", borderRadius: 8, padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: "pointer", marginBottom: 10 }}>
              Choisir un créneau
            </button>
            <div style={{ fontSize: 12, color: GRAY, textAlign: "center" }}>
              La messagerie avec l'hôte s'active après le paiement de votre réservation.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCalendar({ value, onChange }) {
  const [viewDate, setViewDate] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  });
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthLabel = viewDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const todayStr = new Date().toISOString().slice(0, 10);

  function selectDay(d) {
    const dateObj = new Date(year, month, d);
    onChange(dateObj.toISOString().slice(0, 10));
  }

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, width: "100%", maxWidth: 300, boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ border: `1px solid ${BORDER}`, background: "white", cursor: "pointer", fontSize: 13, color: INK, width: 26, height: 26, borderRadius: 6 }}>‹</button>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK, textTransform: "capitalize" }}>{monthLabel}</div>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ border: `1px solid ${BORDER}`, background: "white", cursor: "pointer", fontSize: 13, color: INK, width: 26, height: 26, borderRadius: 6 }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontSize: 11, color: GRAY, marginBottom: 6 }}>
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} style={{ textAlign: "center" }}>{d}</div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const dateObj = new Date(year, month, d);
          const dateStr = dateObj.toISOString().slice(0, 10);
          const isSelected = dateStr === value;
          const isPast = dateStr < todayStr;
          return (
            <button
              key={i}
              disabled={isPast}
              onClick={() => selectDay(d)}
              style={{
                border: "none",
                background: isSelected ? INK : "transparent",
                color: isPast ? "#D8D8D5" : isSelected ? "white" : INK,
                borderRadius: 6,
                height: 30,
                fontSize: 12,
                cursor: isPast ? "not-allowed" : "pointer",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClientReservation({ space, onBack, onConfirm }) {
  const [date, setDate] = useState("2026-09-15");
  const [selected, setSelected] = useState(null);
  const [activite, setActivite] = useState("");
  const [rcProChecked, setRcProChecked] = useState(false);
  const [reglementChecked, setReglementChecked] = useState(false);
  const slots = generateSlots();

  const activiteOk = !space.validationActivite || activite.trim().length > 0;
  const rcProOk = !space.rcProObligatoire || rcProChecked;
  const canSubmit = selected !== null && activiteOk && rcProOk && reglementChecked;

  return (
    <div className="mkt-page-pad" style={{ maxWidth: 1120, margin: "0 auto" }}>
      <Crumbs items={[{ label: "Espaces", onClick: onBack.toHome }, { label: space.nom, onClick: onBack.toSpace }, { label: "Réservation" }]} />
      <div className="mkt-two-col" style={{ display: "grid", gap: 48 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 20 }}>Choisissez un créneau</h1>
          <div style={{ marginBottom: 24 }}>
            <MiniCalendar value={date} onChange={setDate} />
          </div>
          <div className="mkt-slots-grid" style={{ display: "grid", gap: 10, marginBottom: 28 }}>
            {slots.map((slot) => {
              const isSelected = selected === slot.start;
              return (
                <button key={slot.start} onClick={() => setSelected(slot.start)} style={{ border: `1px solid ${isSelected ? INK : BORDER}`, background: isSelected ? INK : "white", color: isSelected ? "white" : INK, borderRadius: 8, padding: "10px 4px", fontSize: 13, cursor: "pointer" }}>
                  {String(slot.start).padStart(2, "0")}:00
                  {slot.mode === "request" && <div style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>sur demande</div>}
                </button>
              );
            })}
          </div>

          {space.validationActivite && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: INK, marginBottom: 6 }}>
                Décrivez l'activité et l'usage prévus de l'espace
              </div>
              <div style={{ fontSize: 12, color: GRAY, marginBottom: 8 }}>
                L'hôte valide chaque demande selon l'activité déclarée avant de confirmer la réservation.
              </div>
              <textarea
                value={activite}
                onChange={(e) => setActivite(e.target.value)}
                placeholder="ex. Tournage photo pour une marque de vêtements, 4 personnes sur place"
                rows={3}
                style={{ width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
              />
            </div>
          )}

          {space.rcProObligatoire && (
            <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: INK, marginBottom: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={rcProChecked} onChange={(e) => setRcProChecked(e.target.checked)} style={{ marginTop: 2 }} />
              Je certifie disposer d'une assurance responsabilité civile professionnelle (RC Pro) en cours de validité.
            </label>
          )}

          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: INK, marginBottom: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={reglementChecked} onChange={(e) => setReglementChecked(e.target.checked)} style={{ marginTop: 2 }} />
            J'ai lu et j'accepte le règlement intérieur de l'espace.
          </label>
          {space.reglementInterieur && (
            <details style={{ marginBottom: 4 }}>
              <summary style={{ fontSize: 12, color: GRAY, cursor: "pointer" }}>Lire le règlement intérieur</summary>
              <p style={{ fontSize: 12, color: GRAY, marginTop: 6 }}>{space.reglementInterieur}</p>
            </details>
          )}
        </div>
        <div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 14 }}>Récapitulatif</div>
            <InfoRow label="Espace" value={space.nom} />
            <InfoRow label="Date" value={new Date(date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} />
            <InfoRow label="Créneau" value={selected !== null ? `${String(selected).padStart(2, "0")}:00 – ${String(selected + 1).padStart(2, "0")}:00` : "—"} />
            <InfoRow label="Annulation" value={space.politiqueAnnulation} />
            {space.caution && <InfoRow label="Caution" value={`${space.caution} € (empreinte, restituée après usage)`} />}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 15, fontWeight: 700, color: INK }}>
              <span>Total</span>
              <span>{space.prix} €</span>
            </div>
            <button
              disabled={!canSubmit}
              onClick={() => onConfirm({ slot: selected, activite, pending: space.validationActivite })}
              style={{ width: "100%", marginTop: 18, background: !canSubmit ? "#F1F1EF" : ACCENT, color: !canSubmit ? GRAY : "white", border: "none", borderRadius: 8, padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: !canSubmit ? "not-allowed" : "pointer" }}
            >
              {space.validationActivite ? "Envoyer la demande de réservation" : "Confirmer et payer"}
            </button>
            {!canSubmit && selected !== null && (
              <div style={{ fontSize: 12, color: GRAY, marginTop: 8 }}>
                {!activiteOk && "Décrivez l'activité prévue. "}
                {!rcProOk && "Confirmez votre assurance RC Pro. "}
                {!reglementChecked && "Acceptez le règlement intérieur."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ClientReservationPending({ space, slot, activite, onHome }) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 32px" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: AMBER, background: AMBER_BG, display: "inline-block", padding: "5px 12px", borderRadius: 999, marginBottom: 16 }}>
        Demande envoyée à l'hôte
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: INK, marginBottom: 10 }}>
        {space.nom}, {String(slot).padStart(2, "0")}:00–{String(slot + 1).padStart(2, "0")}:00
      </h1>
      <p style={{ fontSize: 13, color: GRAY, marginBottom: 24 }}>
        L'hôte examine votre demande selon l'activité déclarée. Vous recevrez une confirmation ou un refus motivé, et les informations d'accès seulement après validation.
      </p>
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22, marginBottom: 22 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Activité déclarée</div>
        <p style={{ fontSize: 13, color: GRAY }}>{activite}</p>
      </div>
      <button onClick={onHome} style={{ width: "100%", background: "white", color: INK, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        Retour à la recherche
      </button>
    </div>
  );
}

function AccessMethodBlock({ space }) {
  const method = space.accessMethod || "code";

  if (method === "qr") {
    return (
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22, textAlign: "center", marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: GRAY, marginBottom: 12 }}>Scannez ce QR code à l'arrivée pour déverrouiller l'accès</div>
        <svg width="120" height="120" viewBox="0 0 120 120" style={{ margin: "0 auto" }}>
          <rect width="120" height="120" fill="white" />
          {Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 8 }).map((_, c) => {
              const on = (r * 7 + c * 3 + r * c) % 3 === 0;
              return on ? <rect key={`${r}-${c}`} x={c * 15} y={r * 15} width="15" height="15" fill={INK} /> : null;
            })
          )}
          <rect x="0" y="0" width="30" height="30" fill="none" stroke={INK} strokeWidth="4" />
          <rect x="90" y="0" width="30" height="30" fill="none" stroke={INK} strokeWidth="4" />
          <rect x="0" y="90" width="30" height="30" fill="none" stroke={INK} strokeWidth="4" />
        </svg>
        <div style={{ fontSize: 11, color: GRAY, marginTop: 10 }}>Le QR code reste actif pendant toute la durée du créneau.</div>
      </div>
    );
  }

  if (method === "boitecles") {
    return (
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22, marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 10 }}>Boîte à clés</div>
        <div style={{ fontSize: 13, color: GRAY, marginBottom: 14 }}>Située à droite de l'entrée principale. Composez le code ci-dessous pour récupérer la clé.</div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, color: INK }}>4 8 1 2</div>
        </div>
      </div>
    );
  }

  if (method === "serrure") {
    return <SerrureConnectee />;
  }

  if (method === "accueil") {
    return (
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22, marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 8 }}>Accès</div>
        <div style={{ fontSize: 13, color: GRAY }}>Présentez-vous à l'accueil, votre réservation est enregistrée automatiquement à votre nom.</div>
      </div>
    );
  }

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22, textAlign: "center", marginBottom: 18 }}>
      <div style={{ fontSize: 13, color: GRAY, marginBottom: 10 }}>Code d'accès temporaire</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, color: INK }}>4 8 1 2</div>
    </div>
  );
}

function SerrureConnectee() {
  const [unlocked, setUnlocked] = useState(false);
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22, textAlign: "center", marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 4 }}>Serrure connectée</div>
      <div style={{ fontSize: 12, color: GRAY, marginBottom: 14 }}>Déverrouillage à distance disponible dès le début du créneau.</div>
      <button
        onClick={() => setUnlocked(true)}
        disabled={unlocked}
        style={{ border: "none", background: unlocked ? "#E7F8EE" : ACCENT, color: unlocked ? "#15803D" : "white", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: unlocked ? "default" : "pointer" }}
      >
        {unlocked ? "Porte déverrouillée ✓" : "Déverrouiller la porte"}
      </button>
    </div>
  );
}

function ClientConfirmation({ space, slot, onHome }) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 32px" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: ACCENT, background: "#EEF2FF", display: "inline-block", padding: "5px 12px", borderRadius: 999, marginBottom: 16 }}>
        Réservation confirmée
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: INK, marginBottom: 24 }}>
        {space.nom}, {String(slot).padStart(2, "0")}:00–{String(slot + 1).padStart(2, "0")}:00
      </h1>
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 22, marginBottom: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Accès</div>
        <InfoRow label="Adresse" value={space.adresse} />
        <InfoRow label="Transports" value={space.transports} />
        <InfoRow label="Wi-Fi" value="Réseau « Atlas-Guest », mot de passe envoyé par e-mail" />
        <InfoRow label="Contact sur place" value="+33 6 12 34 56 78" />
      </div>
      <AccessMethodBlock space={space} />
      <div style={{ marginBottom: 18 }}>
        <MessageButton label="Signaler un problème ou contacter l'hôte" />
      </div>
      <button onClick={onHome} style={{ width: "100%", background: "white", color: INK, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
        Retour à la recherche
      </button>
    </div>
  );
}

function ReviewForm({ onSubmit }) {
  const [rating, setRating] = useState(0);
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginTop: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: INK, marginBottom: 8 }}>Comment s'est passée votre expérience ?</div>
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} onClick={() => setRating(n)} style={{ cursor: "pointer", fontSize: 20, color: n <= rating ? "#F59E0B" : "#E7E7E7" }}>★</span>
        ))}
      </div>
      <textarea placeholder="Propreté, conformité avec l'annonce, facilité d'accès…" rows={3} style={{ width: "100%", border: `1px solid ${BORDER}`, borderRadius: 6, padding: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
      <button onClick={onSubmit} style={{ marginTop: 8, background: INK, color: "white", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>
        Envoyer l'avis
      </button>
    </div>
  );
}

function DepositClaimResponse({ claim }) {
  const [status, setStatus] = useState(claim.status);
  const [contesting, setContesting] = useState(false);
  const [message, setMessage] = useState("");

  if (status === "accepted") {
    return (
      <div style={{ marginTop: 12, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 12, color: GRAY }}>Vous avez accepté cette réclamation. {claim.montant} € seront capturés sur la caution.</div>
      </div>
    );
  }
  if (status === "contested") {
    return (
      <div style={{ marginTop: 12, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12 }}>
        <div style={{ fontSize: 12, color: GRAY }}>Votre contestation a été transmise à la plateforme pour médiation. Aucune capture n'aura lieu tant que le litige n'est pas tranché.</div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12, border: `1px solid ${AMBER}`, background: AMBER_BG, borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: AMBER, marginBottom: 6 }}>
        Réclamation de l'hôte — {claim.montant} € ({claim.motif})
      </div>
      <p style={{ fontSize: 12, color: AMBER, marginBottom: 10 }}>{claim.description}</p>
      <div style={{ fontSize: 11, color: AMBER, marginBottom: 10 }}>
        Vous avez 48h pour contester avec preuves. Sans réponse de votre part, le montant sera automatiquement capturé.
      </div>

      {!contesting ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setStatus("accepted")} style={{ border: "none", background: INK, color: "white", borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>
            Accepter
          </button>
          <button onClick={() => setContesting(true)} style={{ border: `1px solid ${AMBER}`, background: "white", color: AMBER, borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>
            Contester
          </button>
        </div>
      ) : (
        <div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Expliquez pourquoi vous contestez cette réclamation…"
            rows={2}
            style={{ width: "100%", border: `1px solid ${BORDER}`, borderRadius: 6, padding: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              disabled={!message.trim()}
              onClick={() => setStatus("contested")}
              style={{ border: "none", background: message.trim() ? INK : "#F1F1EF", color: message.trim() ? "white" : GRAY, borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: message.trim() ? "pointer" : "not-allowed" }}
            >
              Envoyer la contestation
            </button>
            <button onClick={() => setContesting(false)} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 6, padding: "7px 14px", fontSize: 12, color: INK, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClientBookingCard({ booking }) {
  const [expanded, setExpanded] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(booking.avisLaisse);
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkedOut, setCheckedOut] = useState(false);

  const statusMap = {
    "à venir": { bg: "#EEF2FF", color: ACCENT },
    "en cours": { bg: "#E7F8EE", color: "#15803D" },
    "passée": { bg: "#F1F1EF", color: GRAY },
  };
  const s = statusMap[booking.categorie];

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: INK }}>{booking.space}</div>
          <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>{booking.adresse}</div>
          <div style={{ fontSize: 13, color: INK, marginTop: 6 }}>{booking.date} · {booking.heure}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <Pill text={booking.categorie} bg={s.bg} color={s.color} />
          <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginTop: 8 }}>{booking.montant} €</div>
        </div>
      </div>

      {booking.categorie === "à venir" && (
        <div style={{ fontSize: 12, color: GRAY, marginTop: 10 }}>Rappel automatique prévu 24h avant l'arrivée.</div>
      )}
      {booking.categorie === "en cours" && checkedIn && !checkedOut && (
        <div style={{ fontSize: 12, color: GRAY, marginTop: 10 }}>Rappel automatique prévu avant la fin du créneau.</div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        {booking.categorie === "à venir" && (
          <button style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: INK, cursor: "pointer" }}>
            Voir les instructions d'accès
          </button>
        )}
        {booking.categorie === "en cours" && !checkedIn && (
          <button onClick={() => setCheckedIn(true)} style={{ border: "none", background: ACCENT, color: "white", borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>
            Confirmer le check-in
          </button>
        )}
        {booking.categorie === "en cours" && checkedIn && !checkedOut && (
          <button onClick={() => setCheckedOut(true)} style={{ border: "none", background: INK, color: "white", borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>
            Confirmer le check-out
          </button>
        )}
        {booking.categorie === "en cours" && checkedOut && (
          <span style={{ fontSize: 12, color: GRAY }}>Check-out confirmé, merci !</span>
        )}
        {booking.categorie === "en cours" && (
          <button onClick={() => setExpanded(!expanded)} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: INK, cursor: "pointer" }}>
            Signaler un problème
          </button>
        )}
        {booking.categorie === "passée" && !reviewSubmitted && (
          <button onClick={() => setExpanded(!expanded)} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: INK, cursor: "pointer" }}>
            Laisser un avis
          </button>
        )}
        {booking.categorie === "passée" && reviewSubmitted && (
          <span style={{ fontSize: 12, color: GRAY }}>Avis envoyé — merci !</span>
        )}
      </div>

      {expanded && booking.categorie === "en cours" && (
        <div style={{ marginTop: 10 }}>
          <textarea placeholder="Décrivez le problème rencontré…" rows={2} style={{ width: "100%", border: `1px solid ${BORDER}`, borderRadius: 6, padding: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
          <button style={{ marginTop: 8, background: INK, color: "white", border: "none", borderRadius: 6, padding: "8px 14px", fontSize: 12, cursor: "pointer" }}>Envoyer</button>
        </div>
      )}
      {expanded && booking.categorie === "passée" && !reviewSubmitted && (
        <ReviewForm onSubmit={() => { setReviewSubmitted(true); setExpanded(false); }} />
      )}
      {booking.depositClaim && <DepositClaimResponse claim={booking.depositClaim} />}
    </div>
  );
}

function ClientReservationsList() {
  const [tab, setTab] = useState("à venir");
  const tabs = ["à venir", "en cours", "passée"];
  const filtered = MOCK_CLIENT_BOOKINGS.filter((b) => b.categorie === tab);
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "32px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 20 }}>Mes réservations</h1>
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "#F5F5F4", borderRadius: 8, padding: 3, width: "fit-content" }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ border: "none", background: tab === t ? "white" : "transparent", boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.06)" : "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500, color: tab === t ? INK : GRAY, cursor: "pointer", textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>
      {filtered.length === 0 && <div style={{ fontSize: 13, color: GRAY }}>Aucune réservation {tab}.</div>}
      {filtered.map((b) => (
        <ClientBookingCard key={b.id} booking={b} />
      ))}
    </div>
  );
}

/* ---------------- HOTE ---------------- */

function HostNav({ tab, setTab }) {
  const tabs = ["Tableau de bord", "Établissements & espaces", "Réservations", "Avis", "Messagerie", "Finances"];
  return (
    <div className="mkt-table-wrap" style={{ display: "flex", gap: 4, marginBottom: 28, borderBottom: `1px solid ${BORDER}` }}>
      {tabs.map((t) => (
        <button key={t} onClick={() => setTab(t)} style={{ border: "none", background: "transparent", padding: "12px 4px", marginRight: 24, fontSize: 14, fontWeight: 500, color: tab === t ? INK : GRAY, borderBottom: tab === t ? `2px solid ${INK}` : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }}>
          {t}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, flex: 1 }}>
      <div style={{ fontSize: 13, color: GRAY }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: INK, marginTop: 6 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: GRAY, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const HOST_NOTIFICATIONS = [
  { text: "Nouvelle réservation — Salle Atlas — mardi 14h–16h — 80 €", time: "il y a 12 min" },
  { text: "Fiche « Salle de formation Nord » créée par un commercial, en attente de votre validation", time: "il y a 2 h" },
  { text: "Avis reçu (5★) — Bureau 102", time: "hier" },
  { text: "Reversement de 1 564 € effectué", time: "1 sept." },
];

function HostDashboard({ onGoToPending, onModifierDispo, onModifierPrix, onModifierEspace, onVoirReservations }) {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 24 }}>Bonjour 👋</h1>

      <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Aujourd'hui</div>
      <div className="mkt-stat-row" style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <StatCard label="Réservations" value="3" />
        <StatCard label="Espaces occupés" value="2 / 4" />
        <StatCard label="Prochaine arrivée" value="14h00" sub="Salle Atlas" />
      </div>

      <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Ce mois-ci</div>
      <div className="mkt-stat-row" style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <StatCard label="Revenu net" value="1 564 €" />
        <StatCard label="Réservations" value="27" />
      </div>

      <div className="mkt-two-col-equal" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Actions</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={onModifierDispo} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: INK, cursor: "pointer" }}>
              Modifier disponibilité
            </button>
            <button onClick={onModifierPrix} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: INK, cursor: "pointer" }}>
              Modifier prix
            </button>
            <button onClick={onModifierEspace} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: INK, cursor: "pointer" }}>
              Modifier un espace
            </button>
            <button onClick={onVoirReservations} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "10px 16px", fontSize: 13, color: INK, cursor: "pointer" }}>
              Voir les réservations
            </button>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Notifications récentes</div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
            {HOST_NOTIFICATIONS.map((n, i, arr) => (
              <div key={i} onClick={n.text.includes("validation") ? onGoToPending : undefined} style={{ padding: "12px 16px", borderTop: i > 0 ? `1px solid ${BORDER}` : "none", cursor: n.text.includes("validation") ? "pointer" : "default" }}>
                <div style={{ fontSize: 13, color: INK }}>{n.text}</div>
                <div style={{ fontSize: 11, color: GRAY, marginTop: 3 }}>{n.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 32, borderTop: `1px solid ${BORDER}`, paddingTop: 28 }}>
        <HostCalendar />
      </div>
    </div>
  );
}

function AvailabilityForm() {
  const days = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
  const [active, setActive] = useState(["Lun", "Mar", "Mer", "Jeu", "Ven"]);
  const [exceptions, setExceptions] = useState([{ label: "23 déc. 2026 → 2 jan. 2027 · Fermeture annuelle" }]);
  const [addingException, setAddingException] = useState(false);
  const [newException, setNewException] = useState({ start: "", end: "", reason: "" });
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 500, color: INK, marginBottom: 8 }}>Jours habituels de disponibilité</div>
      <div className="mkt-days-row" style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {days.map((d) => {
          const isActive = active.includes(d);
          return (
            <button key={d} onClick={() => setActive(isActive ? active.filter((x) => x !== d) : [...active, d])} style={{ border: `1px solid ${isActive ? INK : BORDER}`, background: isActive ? INK : "white", color: isActive ? "white" : INK, borderRadius: 8, width: 42, height: 36, fontSize: 12, cursor: "pointer" }}>
              {d}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: INK, marginBottom: 6 }}>Heure de début</div>
          <input type="time" defaultValue="08:00" style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 13 }} />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: INK, marginBottom: 6 }}>Heure de fin</div>
          <input type="time" defaultValue="19:00" style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 13 }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: INK, marginBottom: 6 }}>Durée minimale</div>
          <select style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
            <option>1 heure</option>
            <option>2 heures</option>
            <option>Demi-journée</option>
            <option>Journée complète</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: INK, marginBottom: 6 }}>Délai minimum avant réservation</div>
          <select style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
            <option>Aucun</option>
            <option>1 heure</option>
            <option>24 heures</option>
          </select>
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 500, color: INK, marginBottom: 8 }}>Indisponibilités exceptionnelles</div>
      {exceptions.map((e, i) => (
        <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: GRAY, marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
          <span>{e.label}</span>
          <span onClick={() => setExceptions(exceptions.filter((_, idx) => idx !== i))} style={{ cursor: "pointer", color: INK }}>Supprimer</span>
        </div>
      ))}

      {addingException ? (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
            <input type="date" value={newException.start} onChange={(e) => setNewException({ ...newException, start: e.target.value })} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, flex: 1 }} />
            <input type="date" value={newException.end} onChange={(e) => setNewException({ ...newException, end: e.target.value })} style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, flex: 1 }} />
          </div>
          <input value={newException.reason} onChange={(e) => setNewException({ ...newException, reason: e.target.value })} placeholder="Motif (optionnel)" style={{ width: "100%", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "7px 10px", fontSize: 13, marginBottom: 10, boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                if (!newException.start || !newException.end) return;
                const label = `${new Date(newException.start).toLocaleDateString("fr-FR")} → ${new Date(newException.end).toLocaleDateString("fr-FR")}${newException.reason ? " · " + newException.reason : ""}`;
                setExceptions([...exceptions, { label }]);
                setNewException({ start: "", end: "", reason: "" });
                setAddingException(false);
              }}
              style={{ border: "none", background: INK, color: "white", borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}
            >
              Ajouter
            </button>
            <button onClick={() => setAddingException(false)} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 6, padding: "7px 14px", fontSize: 12, color: INK, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingException(true)} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: INK, cursor: "pointer" }}>
          + Ajouter une exception
        </button>
      )}
    </div>
  );
}

function CancellationPolicyForm({ selected, setSelected }) {
  return (
    <div>
      {CANCELLATION_POLICIES.map((p) => {
        const isSelected = selected === p.nom;
        return (
          <div key={p.nom} onClick={() => setSelected(p.nom)} style={{ border: `1px solid ${isSelected ? INK : BORDER}`, borderRadius: 10, padding: 14, marginBottom: 10, cursor: "pointer", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${isSelected ? INK : BORDER}`, marginTop: 2, flexShrink: 0, background: isSelected ? INK : "white" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{p.nom}</div>
              <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>{p.detail}</div>
              {isSelected && (
                <div style={{ marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                  <InfoRow label="No-show" value={p.noShow} />
                  <InfoRow label="Retard" value={p.retard} />
                  <InfoRow label="Dépassement" value={p.depassement} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ConditionsForm({ space }) {
  const [validation, setValidation] = useState(!!space.validationActivite);
  const [caution, setCaution] = useState(space.caution || "");
  const [rcPro, setRcPro] = useState(!!space.rcProObligatoire);
  const [reglement, setReglement] = useState(space.reglementInterieur || "");

  function Toggle({ checked, onChange }) {
    return (
      <div onClick={() => onChange(!checked)} style={{ width: 38, height: 22, borderRadius: 999, background: checked ? INK : "#E7E7E7", position: "relative", cursor: "pointer", flexShrink: 0 }}>
        <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 2, left: checked ? 18 : 2, transition: "left 0.15s" }} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 0", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: INK }}>Demande de validation manuelle</div>
          <div style={{ fontSize: 12, color: GRAY, marginTop: 3 }}>
            Le client doit décrire l'activité et l'usage prévus. Vous validez ou refusez chaque demande avant confirmation.
          </div>
        </div>
        <Toggle checked={validation} onChange={setValidation} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "16px 0", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 420 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: INK }}>Assurance RC Pro obligatoire</div>
          <div style={{ fontSize: 12, color: GRAY, marginTop: 3 }}>
            Le client doit certifier disposer d'une assurance responsabilité civile professionnelle avant de réserver.
          </div>
        </div>
        <Toggle checked={rcPro} onChange={setRcPro} />
      </div>

      <div style={{ padding: "16px 0", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: INK, marginBottom: 6 }}>Caution demandée</div>
        <div style={{ fontSize: 12, color: GRAY, marginBottom: 10 }}>Laissez vide si aucune caution n'est requise.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="number"
            value={caution}
            onChange={(e) => setCaution(e.target.value)}
            placeholder="0"
            style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 12px", fontSize: 13, width: 120 }}
          />
          <span style={{ fontSize: 13, color: GRAY }}>€</span>
        </div>
      </div>

      <div style={{ padding: "16px 0" }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: INK, marginBottom: 6 }}>Règlement intérieur</div>
        <div style={{ fontSize: 12, color: GRAY, marginBottom: 10 }}>Affiché sur la fiche et à cocher obligatoirement par le client avant réservation.</div>
        <textarea
          value={reglement}
          onChange={(e) => setReglement(e.target.value)}
          rows={4}
          placeholder="ex. Non-fumeur. Rangement demandé après usage. Toute dégradation sera facturée."
          style={{ width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }}
        />
      </div>
    </div>
  );
}

function EquipmentsFaqForm({ space }) {
  const baseAmenities = ["Wi-Fi", "Écran", "Visioconférence", "Café", "Climatisation", "Parking", "Accessible PMR"];
  const [amenities, setAmenities] = useState(space.amenities || []);
  const [customTag, setCustomTag] = useState("");
  const [faq, setFaq] = useState(space.faq || []);

  function toggleAmenity(a) {
    setAmenities((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]));
  }
  function addCustomTag() {
    const t = customTag.trim();
    if (!t || amenities.includes(t)) return;
    setAmenities((list) => [...list, t]);
    setCustomTag("");
  }
  function removeAmenity(a) {
    setAmenities((list) => list.filter((x) => x !== a));
  }
  function addFaqItem() {
    setFaq((list) => [...list, { q: "", r: "" }]);
  }
  function removeFaqItem(i) {
    setFaq((list) => list.filter((_, idx) => idx !== i));
  }
  function updateFaqItem(i, field, value) {
    setFaq((list) => {
      const copy = [...list];
      copy[i] = { ...copy[i], [field]: value };
      return copy;
    });
  }

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 10 }}>Équipements</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {[...new Set([...baseAmenities, ...amenities])].map((a) => {
          const active = amenities.includes(a);
          const isCustom = !baseAmenities.includes(a);
          return (
            <button
              key={a}
              onClick={() => toggleAmenity(a)}
              style={{ border: `1px solid ${active ? INK : BORDER}`, background: active ? INK : "white", color: active ? "white" : INK, borderRadius: 999, padding: "8px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              {a}
              {isCustom && active && (
                <span onClick={(e) => { e.stopPropagation(); removeAmenity(a); }} style={{ fontSize: 11, opacity: 0.8 }}>✕</span>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
        <input
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
          placeholder="Ajouter un équipement non listé"
          style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, boxSizing: "border-box" }}
        />
        <button onClick={addCustomTag} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "9px 16px", fontSize: 13, color: INK, cursor: "pointer" }}>
          Ajouter
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>FAQ</div>
        <button onClick={addFaqItem} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 6, padding: "6px 12px", fontSize: 12, color: INK, cursor: "pointer" }}>
          + Ajouter une question
        </button>
      </div>
      {faq.length === 0 && <div style={{ fontSize: 13, color: GRAY }}>Aucune question pour l'instant.</div>}
      {faq.map((f, i) => (
        <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, marginBottom: 8, position: "relative" }}>
          <button onClick={() => removeFaqItem(i)} style={{ position: "absolute", top: 8, right: 8, border: "none", background: "transparent", color: GRAY, fontSize: 12, cursor: "pointer" }}>✕</button>
          <input
            value={f.q}
            onChange={(e) => updateFaqItem(i, "q", e.target.value)}
            placeholder="Question"
            style={{ display: "block", width: "90%", border: "none", fontSize: 13, fontWeight: 600, color: INK, marginBottom: 6, padding: 0, boxSizing: "border-box" }}
          />
          <textarea
            value={f.r}
            onChange={(e) => updateFaqItem(i, "r", e.target.value)}
            placeholder="Réponse"
            rows={2}
            style={{ display: "block", width: "100%", border: "none", fontSize: 12, color: GRAY, padding: 0, boxSizing: "border-box", fontFamily: "inherit" }}
          />
        </div>
      ))}
    </div>
  );
}

function HostSpaceManage({ space, onBack, initialTab }) {
  const [tab, setTab] = useState(initialTab || "Aperçu");
  const [policy, setPolicy] = useState(space.politiqueAnnulation || "Modérée");
  const tabs = ["Aperçu", "Équipements & FAQ", "Disponibilités", "Politique d'annulation", "Conditions"];
  return (
    <div>
      <Crumbs items={[{ label: "Établissements & espaces", onClick: onBack }, { label: space.nom }]} />
      {space.status === "à valider" && (
        <div style={{ background: AMBER_BG, color: AMBER, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 20 }}>
          Cette fiche a été préconfigurée par un commercial lors d'une visite. Vérifiez les informations puis validez pour la publier.
          {space.hostContact && (
            <div style={{ marginTop: 6, fontSize: 12 }}>
              Contact renseigné par le commercial : {space.hostContact.nom || "—"}
              {space.hostContact.email && ` · ${space.hostContact.email}`}
              {space.hostContact.telephone && ` · ${space.hostContact.telephone}`}
            </div>
          )}
        </div>
      )}
      <h1 style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 20 }}>{space.nom}</h1>
      <div style={{ display: "flex", gap: 4, marginBottom: 24, background: "#F5F5F4", borderRadius: 8, padding: 3, width: "fit-content", flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ border: "none", background: tab === t ? "white" : "transparent", boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.06)" : "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500, color: tab === t ? INK : GRAY, cursor: "pointer" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Aperçu" && (
        <div>
          <InfoRow label="Type" value={space.typeEspace} />
          <InfoRow label="Adresse" value={space.adresse} />
          <InfoRow label="Capacité" value={`${space.capacite} personnes`} />
          <InfoRow label="Superficie" value={`${space.superficie} m²`} />
          <InfoRow label="Prix" value={`${space.prix} € / heure`} />
          <InfoRow label="Vérification" value={space.verified ? `Vérifié le ${space.verifiedAt}` : "Non vérifié"} />
        </div>
      )}
      {tab === "Équipements & FAQ" && <EquipmentsFaqForm space={space} />}
      {tab === "Disponibilités" && <AvailabilityForm />}
      {tab === "Politique d'annulation" && <CancellationPolicyForm selected={policy} setSelected={setPolicy} />}
      {tab === "Conditions" && <ConditionsForm space={space} />}

      {space.status === "à valider" && (
        <button style={{ marginTop: 24, background: ACCENT, color: "white", border: "none", borderRadius: 8, padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Valider et publier la fiche
        </button>
      )}
    </div>
  );
}

function SpaceRowMenu({ space, onManage, open, onToggle }) {
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={onToggle}
        style={{ background: "transparent", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 10px", fontSize: 14, color: INK, cursor: "pointer", lineHeight: 1 }}
      >
        ⋯
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: "white", border: `1px solid ${BORDER}`, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", width: 220, zIndex: 10, overflow: "hidden" }}>
          <button onClick={() => onManage(space, "Aperçu")} style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "white", padding: "10px 14px", fontSize: 13, color: INK, cursor: "pointer" }}>
            Gérer la fiche
          </button>
          <button onClick={() => onManage(space, "Disponibilités")} style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "white", padding: "10px 14px", fontSize: 13, color: INK, cursor: "pointer" }}>
            Modifier les disponibilités
          </button>
          <button onClick={() => onManage(space, "Conditions")} style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "white", padding: "10px 14px", fontSize: 13, color: INK, cursor: "pointer" }}>
            Modifier les conditions
          </button>
          <button style={{ display: "block", width: "100%", textAlign: "left", border: "none", background: "white", padding: "10px 14px", fontSize: 13, color: "#C0392B", cursor: "pointer", borderTop: `1px solid ${BORDER}` }}>
            Désactiver l'espace
          </button>
        </div>
      )}
    </div>
  );
}

function HostSpaces({ spaces, onManage, onAddSpace }) {
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const groups = {};
  spaces.forEach((s) => {
    const key = s.adresse;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  if (creating) {
    return (
      <CommercialWizard
        context="host"
        onSubmit={(form) => {
          onAddSpace({
            id: `space_${Date.now()}`,
            nom: form.nom || "Nouvel espace",
            typeEspace: form.type,
            adresse: form.adresse || "Adresse à compléter",
            capacite: Number(form.capacite) || 1,
            superficie: Number(form.superficie) || 0,
            prix: Number(form.prix) || 0,
            verified: false,
            verifiedAt: null,
            status: "publié",
            ratingAverage: null,
            reviewsCount: 0,
            horaires: "Lun–Ven, 9h–18h",
            transports: "",
            parking: false,
            accessibilite: false,
            amenities: form.equipements,
            regles: "",
            politiqueAnnulation: "Modérée",
            validationActivite: false,
            caution: null,
            rcProObligatoire: false,
            reglementInterieur: "",
            accessMethod: "code",
            titre: form.titre,
            description: form.description,
            tags: form.tags,
            faq: form.faq,
          });
          setCreating(false);
        }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: INK, margin: 0 }}>Tous mes espaces</h1>
        <button onClick={() => setCreating(true)} style={{ background: ACCENT, color: "white", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          + Nouvel espace
        </button>
      </div>

      {Object.entries(groups).map(([adresse, list]) => (
        <div key={adresse} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, color: GRAY, marginBottom: 10 }}>{adresse}</div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "visible" }}>
            <div style={{ display: "flex", alignItems: "center", padding: "10px 18px", background: "#FAFAF9", fontSize: 12, color: GRAY, fontWeight: 500, borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ flex: 1.4 }}>Espace</div>
              <div className="mkt-hide-narrow" style={{ flex: 1 }}>Type</div>
              <div className="mkt-hide-narrow" style={{ flex: 1 }}>Capacité</div>
              <div style={{ flex: 1 }}>Prix</div>
              <div style={{ flex: 1 }}>Statut</div>
              <div style={{ width: 40 }} />
            </div>
            {list.map((s, i, arr) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                <div style={{ flex: 1.4, fontSize: 14, color: INK, fontWeight: 500 }}>{s.nom}</div>
                <div className="mkt-hide-narrow" style={{ flex: 1, fontSize: 13, color: GRAY }}>{s.typeEspace}</div>
                <div className="mkt-hide-narrow" style={{ flex: 1, fontSize: 13, color: GRAY }}>{s.capacite} pers.</div>
                <div style={{ flex: 1, fontSize: 13, color: INK }}>{s.prix} € / h</div>
                <div style={{ flex: 1 }}>
                  {s.status === "à valider" ? <Pill text="À valider" bg={AMBER_BG} color={AMBER} /> : s.verified ? <VerifiedBadge /> : <span style={{ fontSize: 12, color: GRAY }}>Non vérifié</span>}
                </div>
                <div style={{ width: 40, display: "flex", justifyContent: "flex-end" }}>
                  <SpaceRowMenu
                    space={s}
                    onManage={(sp, tab) => { setOpenId(null); onManage(sp, tab); }}
                    open={openId === s.id}
                    onToggle={() => setOpenId(openId === s.id ? null : s.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusPill({ statut }) {
  const colors = { confirmée: { bg: "#EEF2FF", text: ACCENT }, "en attente": { bg: AMBER_BG, text: AMBER }, terminée: { bg: "#F1F1EF", text: GRAY } };
  const c = colors[statut] || colors["terminée"];
  return <Pill text={statut} bg={c.bg} color={c.text} />;
}

function parseHeureRange(heure) {
  const nums = (heure.match(/\d+/g) || []).map(Number);
  return [nums[0] ?? 0, nums[1] ?? 24];
}

function HostCalendar() {
  const [viewDate, setViewDate] = useState(new Date(2026, 8, 1));
  const [selectedDate, setSelectedDate] = useState("2026-09-14");
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [blocked, setBlocked] = useState({});

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthLabel = viewDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const todayStr = new Date().toISOString().slice(0, 10);

  function bookingsForDate(dateStr) {
    return MOCK_BOOKINGS.filter((b) => b.dateISO === dateStr);
  }

  function selectDate(dateStr) {
    setSelectedDate(dateStr);
    setSelectedSlots([]);
  }

  function toggleSlot(hour) {
    setSelectedSlots((prev) => (prev.includes(hour) ? prev.filter((h) => h !== hour) : [...prev, hour].sort((a, b) => a - b)));
  }

  function blockSelected() {
    if (selectedSlots.length === 0) return;
    setBlocked((prev) => ({ ...prev, [selectedDate]: [...(prev[selectedDate] || []), ...selectedSlots] }));
    setSelectedSlots([]);
  }

  const selectedBookings = bookingsForDate(selectedDate);
  const selectedLabel = new Date(selectedDate).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const daySlots = generateSlots();
  const blockedForDay = blocked[selectedDate] || [];

  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Calendrier</div>
      <div className="mkt-calendar-split" style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 28 }}>
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <button onClick={() => setViewDate(new Date(year, month - 1, 1))} style={{ border: `1px solid ${BORDER}`, background: "white", cursor: "pointer", fontSize: 13, color: INK, width: 28, height: 28, borderRadius: 6 }}>
              ‹
            </button>
            <div style={{ fontSize: 14, fontWeight: 600, color: INK, textTransform: "capitalize" }}>{monthLabel}</div>
            <button onClick={() => setViewDate(new Date(year, month + 1, 1))} style={{ border: `1px solid ${BORDER}`, background: "white", cursor: "pointer", fontSize: 13, color: INK, width: 28, height: 28, borderRadius: 6 }}>
              ›
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5, fontSize: 11, color: GRAY, marginBottom: 6 }}>
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} style={{ textAlign: "center" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const dateObj = new Date(year, month, d);
              const dateStr = dateObj.toISOString().slice(0, 10);
              const dayBookings = bookingsForDate(dateStr);
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={i}
                  onClick={() => selectDate(dateStr)}
                  style={{
                    border: isToday && !isSelected ? `1px solid ${INK}` : "1px solid transparent",
                    background: isSelected ? INK : "transparent",
                    color: isSelected ? "white" : INK,
                    borderRadius: 8,
                    height: 48,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  {d}
                  <div style={{ display: "flex", gap: 2, marginTop: 3, height: 5 }}>
                    {dayBookings.slice(0, 3).map((b, bi) => (
                      <span key={bi} style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? "white" : ACCENT }} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginBottom: 10, textTransform: "capitalize" }}>{selectedLabel}</div>

          {selectedBookings.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              {selectedBookings.map((b) => (
                <div key={b.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{b.space}</div>
                    <StatusPill statut={b.statut} />
                  </div>
                  <div style={{ fontSize: 12, color: GRAY, marginTop: 3 }}>{b.heure} · {b.montant} €</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 12, color: GRAY, marginBottom: 8 }}>
            Sélectionnez un ou plusieurs créneaux pour les bloquer manuellement
          </div>
          <div className="mkt-photo-thumbs" style={{ display: "grid", gap: 8 }}>
            {daySlots.map((slot) => {
              const isBooked = selectedBookings.some((b) => {
                const [s, e] = parseHeureRange(b.heure);
                return slot.start >= s && slot.start < e;
              });
              const isBlocked = blockedForDay.includes(slot.start);
              const isSelected = selectedSlots.includes(slot.start);
              const disabled = isBooked || isBlocked;
              return (
                <button
                  key={slot.start}
                  disabled={disabled}
                  onClick={() => toggleSlot(slot.start)}
                  style={{
                    border: `1px solid ${isSelected ? INK : disabled ? BORDER : BORDER}`,
                    background: isSelected ? INK : isBooked ? "#F1F1EF" : isBlocked ? "#FBEAEA" : "white",
                    color: isSelected ? "white" : disabled ? GRAY : INK,
                    borderRadius: 8,
                    padding: "9px 4px",
                    fontSize: 12,
                    cursor: disabled ? "not-allowed" : "pointer",
                  }}
                >
                  {String(slot.start).padStart(2, "0")}:00
                  <div style={{ fontSize: 9, marginTop: 2, opacity: 0.75 }}>
                    {isBooked ? "réservé" : isBlocked ? "bloqué" : isSelected ? "sélectionné" : ""}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            disabled={selectedSlots.length === 0}
            onClick={blockSelected}
            style={{
              marginTop: 14,
              width: "100%",
              border: "none",
              background: selectedSlots.length === 0 ? "#F1F1EF" : INK,
              color: selectedSlots.length === 0 ? GRAY : "white",
              borderRadius: 8,
              padding: "10px 0",
              fontSize: 13,
              fontWeight: 600,
              cursor: selectedSlots.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {selectedSlots.length === 0 ? "Sélectionnez des créneaux" : `Bloquer ${selectedSlots.length} créneau${selectedSlots.length > 1 ? "x" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const MOCK_PENDING_REQUESTS = [
  { id: "p1", space: "Salle Atlas", client: "Julie M.", date: "18 sept.", heure: "10h–14h", montant: 160, activite: "Tournage photo pour une marque de vêtements, 4 personnes sur place, matériel léger." },
  { id: "p2", space: "Studio Lumière", client: "Marc D.", date: "20 sept.", heure: "9h–12h", montant: 165, activite: "Séance de portraits corporate pour une PME, 2 personnes." },
];

function PendingRequestCard({ request, onDecide }) {
  const [refusing, setRefusing] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{request.space} <span style={{ fontWeight: 400, color: GRAY }}>· {request.client}</span></div>
          <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>{request.date} · {request.heure} · {request.montant} €</div>
        </div>
        <Pill text="En attente de validation" bg={AMBER_BG} color={AMBER} />
      </div>
      <div style={{ fontSize: 13, color: INK, marginTop: 10, background: "#FAFAF9", borderRadius: 8, padding: 10 }}>
        {request.activite}
      </div>

      {!refusing ? (
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={() => onDecide(request.id, "accepted")} style={{ border: "none", background: ACCENT, color: "white", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Accepter
          </button>
          <button onClick={() => setRefusing(true)} style={{ border: `1px solid ${BORDER}`, background: "white", color: INK, borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer" }}>
            Refuser
          </button>
        </div>
      ) : (
        <div style={{ marginTop: 12 }}>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif du refus (envoyé au client)" rows={2} style={{ width: "100%", border: `1px solid ${BORDER}`, borderRadius: 6, padding: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              disabled={!reason.trim()}
              onClick={() => onDecide(request.id, "refused", reason)}
              style={{ border: "none", background: reason.trim() ? INK : "#F1F1EF", color: reason.trim() ? "white" : GRAY, borderRadius: 6, padding: "7px 14px", fontSize: 12, cursor: reason.trim() ? "pointer" : "not-allowed" }}
            >
              Confirmer le refus
            </button>
            <button onClick={() => setRefusing(false)} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 6, padding: "7px 14px", fontSize: 12, color: INK, cursor: "pointer" }}>
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DepositClaimForm({ booking, onSubmit, onCancel }) {
  const [motif, setMotif] = useState("Dégradation");
  const [montant, setMontant] = useState(booking.caution);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState(0);
  const canSubmit = description.trim().length > 0 && photos >= 1 && montant > 0 && montant <= booking.caution;

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
      <div style={{ fontSize: 12, color: GRAY, marginBottom: 12 }}>
        Le client sera notifié et disposera de 48h pour contester avant toute capture. Une preuve photo est obligatoire.
      </div>

      <label style={{ fontSize: 13, color: GRAY }}>Motif</label>
      <select value={motif} onChange={(e) => setMotif(e.target.value)} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, margin: "6px 0 14px" }}>
        <option>Dégradation</option>
        <option>No-show</option>
        <option>Retard</option>
        <option>Dépassement de créneau</option>
        <option>Autre</option>
      </select>

      <label style={{ fontSize: 13, color: GRAY }}>Montant demandé (max {booking.caution} €)</label>
      <input
        type="number"
        value={montant}
        max={booking.caution}
        onChange={(e) => setMontant(Math.min(Number(e.target.value), booking.caution))}
        style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, margin: "6px 0 14px", boxSizing: "border-box" }}
      />

      <label style={{ fontSize: 13, color: GRAY }}>Description des faits</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Décrivez précisément ce qui justifie cette demande…"
        style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, margin: "6px 0 14px", boxSizing: "border-box", fontFamily: "inherit" }}
      />

      <label style={{ fontSize: 13, color: GRAY }}>Preuves photo (au moins 1)</label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, margin: "6px 0 16px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} onClick={() => setPhotos((p) => Math.max(p, i + 1))} style={{ border: `1px dashed ${BORDER}`, borderRadius: 8, aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: GRAY, cursor: "pointer" }}>
            {photos > i ? "✓ Ajoutée" : "+ Ajouter"}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          disabled={!canSubmit}
          onClick={() => onSubmit({ motif, montant, description, photos })}
          style={{ border: "none", background: canSubmit ? INK : "#F1F1EF", color: canSubmit ? "white" : GRAY, borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}
        >
          Envoyer la réclamation
        </button>
        <button onClick={onCancel} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "9px 16px", fontSize: 13, color: INK, cursor: "pointer" }}>
          Annuler
        </button>
      </div>
    </div>
  );
}

function HostPastBookingCard({ booking }) {
  const [expanded, setExpanded] = useState(false);
  const [claim, setClaim] = useState(null);

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{booking.space}</div>
          <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>{booking.date} · {booking.heure}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <StatusPill statut={booking.statut} />
          <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginTop: 8 }}>{booking.montant} €</div>
        </div>
      </div>

      {booking.caution > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: GRAY, marginBottom: claim || expanded ? 0 : 10 }}>
            Caution associée : {booking.caution} € (empreinte)
          </div>

          {!claim && !expanded && (
            <button onClick={() => setExpanded(true)} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: INK, cursor: "pointer" }}>
              Demander une capture de caution
            </button>
          )}

          {expanded && !claim && (
            <DepositClaimForm booking={booking} onCancel={() => setExpanded(false)} onSubmit={(c) => { setClaim({ ...c, status: "pending" }); setExpanded(false); }} />
          )}

          {claim && (
            <div style={{ marginTop: 10, border: `1px solid ${AMBER}`, background: AMBER_BG, borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: AMBER }}>Réclamation envoyée — {claim.montant} € ({claim.motif})</div>
              <div style={{ fontSize: 12, color: AMBER, marginTop: 4 }}>Le client a jusqu'à 48h pour contester. Sans réponse, la capture sera effectuée automatiquement.</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HostBookings() {
  const [requests, setRequests] = useState(MOCK_PENDING_REQUESTS);
  const [tab, setTab] = useState("à venir");
  const tabs = ["à venir", "en cours", "passée"];

  function handleDecide(id, decision) {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  const filtered = MOCK_BOOKINGS.filter((b) => b.categorie === tab);

  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 20 }}>Réservations</h1>

      {requests.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Demandes en attente ({requests.length})</div>
          {requests.map((r) => (
            <PendingRequestCard key={r.id} request={r} onDecide={handleDecide} />
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#F5F5F4", borderRadius: 8, padding: 3, width: "fit-content" }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ border: "none", background: tab === t ? "white" : "transparent", boxShadow: tab === t ? "0 1px 2px rgba(0,0,0,0.06)" : "none", borderRadius: 6, padding: "7px 16px", fontSize: 13, fontWeight: 500, color: tab === t ? INK : GRAY, cursor: "pointer", textTransform: "capitalize" }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "passée" ? (
        <div>
          {filtered.length === 0 && <div style={{ fontSize: 13, color: GRAY }}>Aucune réservation passée.</div>}
          {filtered.map((b) => (
            <HostPastBookingCard key={b.id} booking={b} />
          ))}
        </div>
      ) : (
        <div className="mkt-table-wrap" style={{ border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <div className="mkt-table-row" style={{ display: "flex", padding: "10px 18px", background: "#FAFAF9", fontSize: 12, color: GRAY, fontWeight: 500 }}>
            <div style={{ flex: 1.4 }}>Espace</div><div style={{ flex: 1 }}>Date</div><div style={{ flex: 1 }}>Créneau</div><div style={{ flex: 1 }}>Montant</div><div style={{ flex: 1 }}>Paiement</div><div style={{ flex: 1 }}>Statut</div>
          </div>
          {filtered.length === 0 && <div style={{ padding: "16px 18px", fontSize: 13, color: GRAY }}>Aucune réservation {tab}.</div>}
          {filtered.map((b) => (
            <div key={b.id} className="mkt-table-row" style={{ display: "flex", alignItems: "center", padding: "14px 18px", borderTop: `1px solid ${BORDER}`, fontSize: 13, color: INK }}>
              <div style={{ flex: 1.4, fontWeight: 500 }}>{b.space}</div>
              <div style={{ flex: 1, color: GRAY }}>{b.date}</div>
              <div style={{ flex: 1, color: GRAY }}>{b.heure}</div>
              <div style={{ flex: 1 }}>{b.montant} €</div>
              <div style={{ flex: 1, color: GRAY }}>{b.paiement}</div>
              <div style={{ flex: 1 }}><StatusPill statut={b.statut} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MOCK_REVIEWS = [
  { id: "r1", space: "Bureau 102", client: "Amélie R.", note: 5, date: "10 sept.", commentaire: "Espace impeccable, accès très simple avec le code temporaire. Je recommande.", criteres: "Propreté, conformité, accès" },
  { id: "r2", space: "Salle Atlas", client: "Karim B.", note: 4, date: "5 sept.", commentaire: "Bonne salle, visioconférence de qualité. Le café était vide à l'arrivée.", criteres: "Équipements, expérience globale" },
  { id: "r3", space: "Cabinet Bellevue", client: "Sophie L.", note: 5, date: "28 août", commentaire: "Cabinet très calme, parfait pour recevoir des clients.", criteres: "Facilité d'accès, propreté" },
];

function ReviewStars({ note }) {
  return (
    <span style={{ color: "#F59E0B", fontSize: 13 }}>
      {"★".repeat(note)}
      <span style={{ color: "#E7E7E7" }}>{"★".repeat(5 - note)}</span>
    </span>
  );
}

function HostReviews() {
  const avg = (MOCK_REVIEWS.reduce((sum, r) => sum + r.note, 0) / MOCK_REVIEWS.length).toFixed(1);
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 4 }}>Avis</h1>
      <p style={{ fontSize: 13, color: GRAY, marginBottom: 20 }}>
        Note moyenne : <strong style={{ color: INK }}>{avg} / 5</strong> sur {MOCK_REVIEWS.length} avis
      </p>
      {MOCK_REVIEWS.map((r) => (
        <div key={r.id} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{r.space} <span style={{ fontWeight: 400, color: GRAY }}>· {r.client}</span></div>
              <ReviewStars note={r.note} />
            </div>
            <div style={{ fontSize: 12, color: GRAY }}>{r.date}</div>
          </div>
          <p style={{ fontSize: 13, color: INK, marginTop: 10 }}>{r.commentaire}</p>
          <div style={{ fontSize: 11, color: GRAY, marginTop: 6 }}>Critères évalués : {r.criteres}</div>
        </div>
      ))}
    </div>
  );
}

function HostMessaging() {
  const threads = [
    { client: "Julie M.", space: "Salle Atlas", last: "Est-ce que je peux arriver 10 min en avance ?", time: "10:32", unread: true },
    { client: "Marc D.", space: "Bureau 101", last: "Merci, tout s'est bien passé !", time: "hier", unread: false },
  ];
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 8 }}>Messagerie</h1>
      <p style={{ fontSize: 13, color: GRAY, marginBottom: 20 }}>
        La réservation ne nécessite jamais d'échange — la messagerie sert aux demandes particulières et aux imprévus.
      </p>
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        {threads.map((t, i, arr) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 18px", borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: t.unread ? 600 : 500, color: INK }}>{t.client} <span style={{ fontWeight: 400, color: GRAY }}>· {t.space}</span></div>
              <div style={{ fontSize: 13, color: GRAY, marginTop: 3 }}>{t.last}</div>
            </div>
            <div style={{ fontSize: 12, color: GRAY }}>{t.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HostFinances() {
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 20 }}>Finances</h1>
      <div className="mkt-stat-row" style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <StatCard label="Revenu net du mois" value="1 564 €" />
        <StatCard label="Réservations" value="27" />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: INK, marginBottom: 12 }}>Historique des reversements</div>
      <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
        {[{ date: "1 sept. 2026", montant: "1 564 €" }, { date: "1 août 2026", montant: "1 402 €" }, { date: "1 juil. 2026", montant: "1 190 €" }].map((r, i) => (
          <div key={i} style={{ display: "flex", padding: "14px 18px", borderTop: i > 0 ? `1px solid ${BORDER}` : "none", fontSize: 13 }}>
            <div style={{ flex: 1, color: GRAY }}>{r.date}</div>
            <div style={{ flex: 1, color: INK, fontWeight: 500 }}>{r.montant}</div>
            <div style={{ flex: 1, color: GRAY }}>Reversé</div>
            <button style={{ background: "transparent", border: "none", color: ACCENT, fontSize: 13, cursor: "pointer" }}>Télécharger la facture</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function HostApp({ spaces, onAddSpace, activatedSpaceId }) {
  const [tab, setTab] = useState("Tableau de bord");
  const [managing, setManaging] = useState(() => {
    if (activatedSpaceId) {
      const sp = spaces.find((s) => s.id === activatedSpaceId);
      if (sp) return { space: sp, tab: "Aperçu" };
    }
    return null;
  });
  const [justActivated] = useState(!!activatedSpaceId);

  const firstPublished = spaces.find((s) => s.status === "publié") || spaces[0];

  if (managing) {
    return (
      <div className="mkt-page-pad" style={{ maxWidth: 1120, margin: "0 auto" }}>
        {justActivated && managing.space.id === activatedSpaceId && (
          <div style={{ background: "#E7F8EE", color: "#15803D", borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 20 }}>
            Compte activé — vous êtes connecté. Vérifiez cette fiche avant de la publier.
          </div>
        )}
        <HostSpaceManage space={managing.space} initialTab={managing.tab} onBack={() => setManaging(null)} />
      </div>
    );
  }

  return (
    <div className="mkt-page-pad" style={{ maxWidth: 1120, margin: "0 auto" }}>
      <HostNav tab={tab} setTab={setTab} />
      {tab === "Tableau de bord" && (
        <HostDashboard
          onGoToPending={() => setTab("Établissements & espaces")}
          onModifierDispo={() => setManaging({ space: firstPublished, tab: "Disponibilités" })}
          onModifierPrix={() => setManaging({ space: firstPublished, tab: "Aperçu" })}
          onModifierEspace={() => setManaging({ space: firstPublished, tab: "Aperçu" })}
          onVoirReservations={() => setTab("Réservations")}
        />
      )}
      {tab === "Établissements & espaces" && <HostSpaces spaces={spaces} onManage={(s, t) => setManaging({ space: s, tab: t || "Aperçu" })} onAddSpace={onAddSpace} />}
      {tab === "Réservations" && <HostBookings />}
      {tab === "Avis" && <HostReviews />}
      {tab === "Messagerie" && <HostMessaging />}
      {tab === "Finances" && <HostFinances />}
    </div>
  );
}

/* ---------------- COMMERCIAL ---------------- */

function CommercialWizard({ onSubmit, context = "commercial", establishments = [] }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
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
    photos: 0,
    titre: "",
    description: "",
    tags: [],
    faq: [],
  });
  const [genStatus, setGenStatus] = useState("idle");
  const isHost = context === "host";
  const steps = isHost ? ["Essentiel", "Équipements", "Photos", "Récapitulatif", "Génération"] : ["Destinataire", "Essentiel", "Équipements", "Photos", "Récapitulatif", "Génération"];
  const current = steps[step];
  const baseAmenities = ["Wi-Fi", "Écran", "Visioconférence", "Café", "Climatisation", "Parking", "Accessible PMR"];

  const hostStepValid = isHost || ((form.etablissement || form.nouvelEtablissement.trim()) && form.hostName.trim() && (form.hostEmail.trim() || form.hostPhone.trim()));

  function toggleAmenity(a) {
    setForm((f) => ({ ...f, equipements: f.equipements.includes(a) ? f.equipements.filter((x) => x !== a) : [...f.equipements, a] }));
  }

  function addCustomTag() {
    const t = form.customTag.trim();
    if (!t || form.equipements.includes(t)) return;
    setForm((f) => ({ ...f, equipements: [...f.equipements, t], customTag: "" }));
  }

  function removeAmenity(a) {
    setForm((f) => ({ ...f, equipements: f.equipements.filter((x) => x !== a) }));
  }

  function addFaqItem() {
    setForm((f) => ({ ...f, faq: [...f.faq, { q: "", r: "" }] }));
  }

  function removeFaqItem(i) {
    setForm((f) => ({ ...f, faq: f.faq.filter((_, idx) => idx !== i) }));
  }

  function generateFiche() {
    setGenStatus("loading");
    setTimeout(() => {
      setForm((f) => ({
        ...f,
        titre: `${f.nom || "Espace"} — ${f.type} au calme`,
        description: `${f.nom || "Cet espace"} est un ${f.type.toLowerCase()} de ${f.capacite || "plusieurs"} personnes, situé ${f.adresse ? "au " + f.adresse : "en centre-ville"}. Idéal pour vos réunions, rendez-vous ou séances de travail, avec un accès simple et un usage autonome dès la réservation.`,
        tags: [f.type, ...f.equipements.slice(0, 3)].filter(Boolean),
        faq: [
          { q: "Comment accéder à l'espace le jour J ?", r: "Les instructions d'accès (adresse précise, code, contact) sont envoyées automatiquement après réservation." },
          { q: "Le prix inclut-il les équipements listés ?", r: `Oui, ${f.equipements.length > 0 ? f.equipements.join(", ").toLowerCase() : "les équipements présentés"} sont inclus dans le tarif affiché.` },
        ],
      }));
      setGenStatus("done");
    }, 900);
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 32px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 6 }}>{isHost ? "Créer un nouvel espace" : "Créer une fiche pendant la visite"}</h1>
      <p style={{ fontSize: 13, color: GRAY, marginBottom: 24 }}>
        {isHost ? "Ce formulaire génère la fiche automatiquement à partir des informations essentielles." : "Formulaire rapide — l'hôte n'aura plus qu'à valider avant publication."}
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: i <= step ? ACCENT : BORDER }} />
        ))}
      </div>

      {current === "Destinataire" && (
        <div>
          <div style={{ fontSize: 12, color: GRAY, marginBottom: 16 }}>
            Cette fiche sera envoyée pour validation à l'hôte que vous identifiez ici.
          </div>

          <label style={{ fontSize: 13, color: GRAY }}>Établissement existant</label>
          <select
            value={form.etablissement}
            onChange={(e) => setForm({ ...form, etablissement: e.target.value, nouvelEtablissement: "" })}
            style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 12px" }}
          >
            <option value="">— Nouvel établissement —</option>
            {establishments.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>

          {!form.etablissement && (
            <>
              <label style={{ fontSize: 13, color: GRAY }}>Nom du nouvel établissement</label>
              <input value={form.nouvelEtablissement} onChange={(e) => setForm({ ...form, nouvelEtablissement: e.target.value })} placeholder="ex. Centre d'affaires Opéra" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 18px", boxSizing: "border-box" }} />
            </>
          )}

          <label style={{ fontSize: 13, color: GRAY }}>Nom du contact hôte</label>
          <input value={form.hostName} onChange={(e) => setForm({ ...form, hostName: e.target.value })} placeholder="Prénom et nom" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 18px", boxSizing: "border-box" }} />

          <div className="mkt-form-row-3" style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, color: GRAY }}>Email</label>
              <input value={form.hostEmail} onChange={(e) => setForm({ ...form, hostEmail: e.target.value })} placeholder="hote@exemple.com" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, color: GRAY }}>Téléphone</label>
              <input value={form.hostPhone} onChange={(e) => setForm({ ...form, hostPhone: e.target.value })} placeholder="+33 6 …" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />
            </div>
          </div>
          {!hostStepValid && (
            <div style={{ fontSize: 12, color: GRAY, marginTop: 10 }}>Renseignez l'établissement, le nom du contact et au moins un moyen de le joindre.</div>
          )}
        </div>
      )}

      {current === "Essentiel" && (
        <div>
          <label style={{ fontSize: 13, color: GRAY }}>Nom de l'espace</label>
          <input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="ex. Salle Atlas" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 18px", boxSizing: "border-box" }} />

          <label style={{ fontSize: 13, color: GRAY }}>Type d'espace</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 18px" }}>
            {SPACE_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

          <label style={{ fontSize: 13, color: GRAY }}>Adresse</label>
          <input value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} placeholder="Adresse complète" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 18px", boxSizing: "border-box" }} />

          <div className="mkt-form-row-3" style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, color: GRAY }}>Capacité</label>
              <input value={form.capacite} onChange={(e) => setForm({ ...form, capacite: e.target.value })} placeholder="Personnes" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, color: GRAY }}>Superficie (m²)</label>
              <input value={form.superficie} onChange={(e) => setForm({ ...form, superficie: e.target.value })} placeholder="m²" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 13, color: GRAY }}>Prix (€/h)</label>
              <input value={form.prix} onChange={(e) => setForm({ ...form, prix: e.target.value })} placeholder="€/h" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />
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
                <button
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
          <label style={{ fontSize: 13, color: GRAY }}>Ajouter un équipement non listé</label>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              value={form.customTag}
              onChange={(e) => setForm({ ...form, customTag: e.target.value })}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTag(); } }}
              placeholder="ex. Tableau blanc, Terrasse…"
              style={{ flex: 1, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, boxSizing: "border-box" }}
            />
            <button onClick={addCustomTag} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "9px 16px", fontSize: 13, color: INK, cursor: "pointer" }}>
              Ajouter
            </button>
          </div>
        </div>
      )}

      {current === "Photos" && (
        <div>
          <p style={{ fontSize: 13, color: GRAY, marginBottom: 12 }}>Prenez au moins 3 photos depuis votre téléphone pendant la visite.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} onClick={() => setForm((f) => ({ ...f, photos: Math.max(f.photos, i + 1) }))} style={{ border: `1px dashed ${BORDER}`, borderRadius: 8, aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: GRAY, cursor: "pointer" }}>
                {form.photos > i ? "✓ Ajoutée" : "+ Ajouter"}
              </div>
            ))}
          </div>
        </div>
      )}

      {current === "Récapitulatif" && (
        <div>
          {!isHost && (
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: GRAY, marginBottom: 6 }}>Destinataire de la validation</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{form.hostName || "Contact non renseigné"}</div>
              <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>{form.etablissement || form.nouvelEtablissement || "Établissement non renseigné"}</div>
              <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>{[form.hostEmail, form.hostPhone].filter(Boolean).join(" · ")}</div>
            </div>
          )}
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: INK }}>{form.nom || "Nom non renseigné"}</div>
            <div style={{ fontSize: 13, color: GRAY, marginTop: 2 }}>{form.type} · {form.adresse || "Adresse non renseignée"}</div>
            <div style={{ fontSize: 13, color: INK, marginTop: 8 }}>{form.capacite || "—"} personnes · {form.superficie || "—"} m² · {form.prix || "—"} €/h · {form.photos} photo(s) · {form.equipements.length} équipement(s)</div>
          </div>
          <div style={{ fontSize: 12, color: GRAY, marginBottom: 16 }}>
            À l'étape suivante, le titre, la description, les tags et la FAQ seront générés automatiquement à partir de ces informations, et resteront modifiables avant l'envoi.
          </div>
        </div>
      )}

      {current === "Génération" && (
        <div>
          {genStatus === "idle" && (
            <button onClick={generateFiche} style={{ width: "100%", border: "none", background: ACCENT, color: "white", borderRadius: 8, padding: "12px 0", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              Générer la fiche automatiquement
            </button>
          )}
          {genStatus === "loading" && (
            <div style={{ fontSize: 13, color: GRAY, textAlign: "center", padding: "20px 0" }}>Génération en cours…</div>
          )}
          {genStatus === "done" && (
            <div>
              <label style={{ fontSize: 13, color: GRAY }}>Titre</label>
              <input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 16px", boxSizing: "border-box" }} />

              <label style={{ fontSize: 13, color: GRAY }}>Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 13, margin: "6px 0 16px", boxSizing: "border-box", fontFamily: "inherit" }} />

              <label style={{ fontSize: 13, color: GRAY }}>Tags</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "6px 0 16px" }}>
                {form.tags.map((t) => (
                  <span key={t} style={{ fontSize: 12, color: INK, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "5px 10px" }}>{t}</span>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 13, color: GRAY }}>FAQ</label>
                <button onClick={addFaqItem} style={{ border: `1px solid ${BORDER}`, background: "white", borderRadius: 6, padding: "5px 10px", fontSize: 12, color: INK, cursor: "pointer" }}>
                  + Ajouter une question
                </button>
              </div>
              {form.faq.map((f, i) => (
                <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, marginTop: 8, position: "relative" }}>
                  <button
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
              <button onClick={generateFiche} style={{ marginTop: 12, border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "8px 14px", fontSize: 12, color: INK, cursor: "pointer" }}>
                Régénérer
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28 }}>
        <button disabled={step === 0} onClick={() => setStep(step - 1)} style={{ border: `1px solid ${BORDER}`, background: "white", color: step === 0 ? BORDER : INK, borderRadius: 8, padding: "10px 18px", fontSize: 13, cursor: step === 0 ? "not-allowed" : "pointer" }}>
          Précédent
        </button>
        {step < steps.length - 1 ? (
          <button
            disabled={current === "Destinataire" && !hostStepValid}
            onClick={() => setStep(step + 1)}
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
          <button disabled={genStatus !== "done"} onClick={() => onSubmit(form)} style={{ border: "none", background: genStatus === "done" ? ACCENT : "#F1F1EF", color: genStatus === "done" ? "white" : GRAY, borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 600, cursor: genStatus === "done" ? "pointer" : "not-allowed" }}>
            {isHost ? "Publier l'espace" : "Envoyer à l'hôte pour validation"}
          </button>
        )}
      </div>
    </div>
  );
}


function CommercialConfirmation({ onNew, onViewInvitation, hostName, hostEmail, etablissement, spaceNom, isNewHost }) {
  return (
    <div style={{ maxWidth: 480, margin: "60px auto", padding: "32px", textAlign: "center" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: ACCENT, background: "#EEF2FF", display: "inline-block", padding: "5px 12px", borderRadius: 999, marginBottom: 16 }}>
        Fiche envoyée
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: INK, marginBottom: 10 }}>
        Envoyée à {hostName || "l'hôte"} pour validation
      </h1>
      <p style={{ fontSize: 13, color: GRAY, marginBottom: 24 }}>
        {etablissement && <>Établissement : {etablissement}<br /></>}
        L'hôte recevra une notification et pourra publier la fiche en un clic après vérification.
      </p>

      {isNewHost && hostEmail && (
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, marginBottom: 20, textAlign: "left" }}>
          <div style={{ fontSize: 12, color: GRAY, marginBottom: 10 }}>Aucun compte n'existait pour {hostEmail} — un email d'invitation est envoyé automatiquement :</div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 14, background: "#FAFAF9" }}>
            <div style={{ fontSize: 12, color: GRAY }}>À : {hostEmail}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: INK, marginTop: 6 }}>Votre espace « {spaceNom} » est prêt à être publié</div>
            <p style={{ fontSize: 12, color: GRAY, marginTop: 8 }}>
              Bonjour {hostName}, une fiche a été créée pour vous suite à la visite de notre commercial. Choisissez un mot de passe pour activer votre compte et la valider.
            </p>
            <div style={{ fontSize: 12, color: ACCENT, marginTop: 8, textDecoration: "underline" }}>Choisir mon mot de passe →</div>
          </div>
          <button onClick={onViewInvitation} style={{ width: "100%", marginTop: 12, border: `1px solid ${BORDER}`, background: "white", borderRadius: 8, padding: "9px 0", fontSize: 12, color: INK, cursor: "pointer" }}>
            Simuler l'ouverture de l'email (démo)
          </button>
        </div>
      )}

      <button onClick={onNew} style={{ background: INK, color: "white", border: "none", borderRadius: 8, padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        Créer une autre fiche
      </button>
    </div>
  );
}

function HostInvitation({ space, onActivate }) {
  const contact = space.hostContact || {};
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const tooShort = password.length > 0 && password.length < 6;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 6 && password === confirm;

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", padding: "32px" }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: GRAY, marginBottom: 16 }}>Aperçu de l'email reçu par l'hôte</div>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 8 }}>Bienvenue{contact.nom ? `, ${contact.nom}` : ""} 👋</h1>
      <p style={{ fontSize: 13, color: GRAY, marginBottom: 24 }}>
        Une fiche pour <strong style={{ color: INK, fontWeight: 500 }}>{space.nom}</strong> a été créée suite à la visite de notre commercial. Choisissez un mot de passe pour activer votre compte et la retrouver.
      </p>

      <label style={{ fontSize: 13, color: GRAY }}>Email</label>
      <input value={contact.email || ""} disabled style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 16px", boxSizing: "border-box", color: GRAY, background: "#FAFAF9" }} />

      <label style={{ fontSize: 13, color: GRAY }}>Choisir un mot de passe</label>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0 16px", boxSizing: "border-box" }} />

      <label style={{ fontSize: 13, color: GRAY }}>Confirmer le mot de passe</label>
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={{ display: "block", width: "100%", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, margin: "6px 0", boxSizing: "border-box" }} />

      {(tooShort || mismatch) && (
        <div style={{ fontSize: 12, color: GRAY, marginTop: 8 }}>
          {tooShort ? "6 caractères minimum." : "Les mots de passe ne correspondent pas."}
        </div>
      )}

      <button
        disabled={!canSubmit}
        onClick={onActivate}
        style={{ width: "100%", marginTop: 20, border: "none", background: canSubmit ? ACCENT : "#F1F1EF", color: canSubmit ? "white" : GRAY, borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: canSubmit ? "pointer" : "not-allowed" }}
      >
        Créer mon compte et me connecter
      </button>
    </div>
  );
}

/* ---------------- APP ---------------- */

export default function App() {
  const [mode, setMode] = useState("accueil");
  const [auth, setAuth] = useState({ client: false, hote: false, commercial: false });
  const [screen, setScreen] = useState("search");
  const [space, setSpace] = useState(null);
  const [slot, setSlot] = useState(null);
  const [activiteDeclaree, setActiviteDeclaree] = useState("");
  const [spaces, setSpaces] = useState([
    ...MOCK_SPACES,
    { id: "space_5", nom: "Salle de formation Nord", typeEspace: "Salle de formation", adresse: "45 boulevard Voltaire, 75011 Paris", capacite: 20, superficie: 60, prix: 90, verified: false, status: "à valider", ratingAverage: null, reviewsCount: 0, horaires: "—", transports: "", parking: false, accessibilite: false, amenities: [], regles: "", politiqueAnnulation: "Modérée", faq: [] },
  ].filter((s, i, arr) => arr.findIndex((x) => x.nom === s.nom) === i || s.status === "à valider"));
  const [commercialSubmitted, setCommercialSubmitted] = useState(null);
  const [invitationSpaceId, setInvitationSpaceId] = useState(null);
  const [activatedSpaceId, setActivatedSpaceId] = useState(null);

  function goHome() {
    setMode("accueil");
    setScreen("search");
  }

  function handleAddSpace(newSpace) {
    setSpaces((prev) => [...prev, newSpace]);
  }

  function handleCommercialSubmit(form) {
    const etablissement = form.etablissement || form.nouvelEtablissement;
    const knownHostEmails = spaces.map((s) => s.hostContact?.email).filter(Boolean);
    const isNewHost = form.hostEmail && !knownHostEmails.includes(form.hostEmail);
    const newId = `space_${Date.now()}`;
    handleAddSpace({
      id: newId,
      nom: form.nom || "Nouvel espace",
      typeEspace: form.type,
      adresse: form.adresse || etablissement || "Adresse à compléter",
      capacite: Number(form.capacite) || 1,
      superficie: Number(form.superficie) || 0,
      prix: Number(form.prix) || 0,
      verified: false,
      verifiedAt: null,
      status: "à valider",
      ratingAverage: null,
      reviewsCount: 0,
      horaires: "Lun–Ven, 9h–18h",
      transports: "",
      parking: false,
      accessibilite: false,
      amenities: form.equipements,
      regles: "",
      politiqueAnnulation: "Modérée",
      validationActivite: false,
      caution: null,
      rcProObligatoire: false,
      reglementInterieur: "",
      accessMethod: "code",
      titre: form.titre,
      description: form.description,
      tags: form.tags,
      faq: form.faq,
      hostContact: { etablissement, nom: form.hostName, email: form.hostEmail, telephone: form.hostPhone },
    });
    setCommercialSubmitted({ hostName: form.hostName, hostEmail: form.hostEmail, etablissement, spaceNom: form.nom || "Nouvel espace", spaceId: newId, isNewHost });
  }

  const establishments = [...new Set(spaces.map((s) => s.adresse).filter(Boolean))];
  const invitationSpace = invitationSpaceId ? spaces.find((s) => s.id === invitationSpaceId) : null;

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "white", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap');
        .mkt-topnav-inner { flex-wrap: wrap; gap: 10px; }
        .mkt-page-pad { padding: 32px; }
        .mkt-searchbar { flex-direction: row; }
        .mkt-grid-cards { grid-template-columns: repeat(4, 1fr); }
        .mkt-two-col { grid-template-columns: 1.6fr 1fr; }
        .mkt-photo-thumbs { grid-template-columns: repeat(4, 1fr); }
        .mkt-slots-grid { grid-template-columns: repeat(4, 1fr); }
        .mkt-table-wrap { overflow-x: auto; }
        .mkt-table-row { min-width: 640px; }
        .mkt-days-row { flex-wrap: wrap; }
        .mkt-stat-row { flex-wrap: wrap; }
        .mkt-form-row-3 { flex-direction: row; }
        .mkt-two-col-equal { grid-template-columns: 1fr 1fr; }
        .mkt-calendar-split { grid-template-columns: 1.1fr 1fr; }
        @media (max-width: 900px) {
          .mkt-grid-cards { grid-template-columns: repeat(2, 1fr) !important; }
          .mkt-two-col { grid-template-columns: 1fr !important; gap: 28px !important; }
          .mkt-two-col-equal { grid-template-columns: 1fr !important; }
          .mkt-calendar-split { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .mkt-page-pad { padding: 24px 16px !important; }
          .mkt-grid-cards { grid-template-columns: repeat(2, 1fr) !important; gap: 14px !important; }
          .mkt-photo-thumbs { grid-template-columns: repeat(2, 1fr) !important; }
          .mkt-slots-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .mkt-searchbar { flex-direction: column !important; }
          .mkt-searchbar > div { border-right: none !important; border-bottom: 1px solid ${BORDER} !important; }
          .mkt-searchbar button { padding: 14px 0 !important; }
          .mkt-form-row-3 { flex-direction: column !important; }
          .mkt-stat-row > div { min-width: 140px; }
          .mkt-hide-narrow { display: none !important; }
        }
        @media (max-width: 420px) {
          .mkt-grid-cards { grid-template-columns: 1fr !important; }
          .mkt-slots-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
      <TopNav mode={mode} setMode={setMode} onLogoClick={goHome} />

      {mode === "hote" && (
        auth.hote ? (
          <HostApp spaces={spaces} onAddSpace={handleAddSpace} activatedSpaceId={activatedSpaceId} />
        ) : (
          <AuthScreen roleLabel="Espace hôte" onSuccess={() => setAuth((a) => ({ ...a, hote: true }))} />
        )
      )}

      {mode === "commercial" && !invitationSpaceId && (
        !auth.commercial ? (
          <AuthScreen roleLabel="Espace commercial" onSuccess={() => setAuth((a) => ({ ...a, commercial: true }))} />
        ) : commercialSubmitted ? (
          <CommercialConfirmation
            onNew={() => setCommercialSubmitted(null)}
            onViewInvitation={() => setInvitationSpaceId(commercialSubmitted.spaceId)}
            hostName={commercialSubmitted.hostName}
            hostEmail={commercialSubmitted.hostEmail}
            etablissement={commercialSubmitted.etablissement}
            spaceNom={commercialSubmitted.spaceNom}
            isNewHost={commercialSubmitted.isNewHost}
          />
        ) : (
          <CommercialWizard onSubmit={handleCommercialSubmit} establishments={establishments} />
        )
      )}

      {invitationSpaceId && invitationSpace && (
        <HostInvitation
          space={invitationSpace}
          onActivate={() => {
            setActivatedSpaceId(invitationSpace.id);
            setInvitationSpaceId(null);
            setCommercialSubmitted(null);
            setAuth((a) => ({ ...a, hote: true }));
            setMode("hote");
          }}
        />
      )}

      {mode === "client" && (
        auth.client ? (
          <ClientReservationsList />
        ) : (
          <AuthScreen roleLabel="Espace client" onSuccess={() => setAuth((a) => ({ ...a, client: true }))} />
        )
      )}

      {mode === "accueil" && (
        <>
          {screen === "search" && (
            <ClientSearch
              spaces={spaces}
              onSelectSpace={(s) => { setSpace(s); setScreen("detail"); }}
            />
          )}
          {screen === "detail" && <ClientDetail space={space} onBack={() => setScreen("search")} onReserve={() => setScreen("reservation")} />}
          {screen === "reservation" && (
            <ClientReservation
              space={space}
              onBack={{ toHome: () => setScreen("search"), toSpace: () => setScreen("detail") }}
              onConfirm={({ slot, activite, pending }) => {
                setSlot(slot);
                setActiviteDeclaree(activite);
                setScreen(pending ? "pending" : "confirmation");
              }}
            />
          )}
          {screen === "confirmation" && <ClientConfirmation space={space} slot={slot} onHome={() => setScreen("search")} />}
          {screen === "pending" && <ClientReservationPending space={space} slot={slot} activite={activiteDeclaree} onHome={() => setScreen("search")} />}
        </>
      )}
    </div>
  );
}
