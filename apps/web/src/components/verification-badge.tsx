/**
 * Verification of the space itself, never inferred from the host's identity.
 * Prototype behaviour (client-facing): purely additive trust signal — nothing
 * is shown when the space isn't verified (no "Non vérifié" badge). The host's
 * own space list is an operational view, not a trust signal to a stranger, so
 * it opts into `showPending` to still see its own pending-verification state.
 */
export default function VerificationBadge({
  verifiedAt,
  showPending = false,
}: {
  verifiedAt?: string | null;
  showPending?: boolean;
}) {
  const verified = !!verifiedAt && Number.isFinite(Date.parse(verifiedAt));
  if (!verified) {
    if (!showPending) return null;
    return (
      <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-muted">
        Non vérifié
      </span>
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-ink"
      title="La vérification de cet espace a été enregistrée."
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="6" fill="#2454FF" />
        <path d="M3.3 6.1 5 7.8 8.7 4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Vérifié
    </span>
  );
}
