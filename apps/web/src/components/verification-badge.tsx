/** Verification of the space itself, never inferred from the host's identity. */
export default function VerificationBadge({ verifiedAt }: { verifiedAt?: string | null }) {
  const verified = !!verifiedAt && Number.isFinite(Date.parse(verifiedAt));

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium ${verified ? 'text-ink' : 'text-muted'}`}
      title={verified ? 'La vérification de cet espace a été enregistrée.' : 'Aucune vérification enregistrée pour cet espace.'}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        {verified ? (
          <>
            <circle cx="6" cy="6" r="6" fill="#2454FF" />
            <path d="M3.3 6.1 5 7.8 8.7 4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </>
        ) : (
          <>
            <circle cx="6" cy="6" r="5.3" stroke="currentColor" strokeWidth="1.2" />
            <path d="M4 6h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </>
        )}
      </svg>
      {verified ? 'Vérifié' : 'Non vérifié'}
    </span>
  );
}
