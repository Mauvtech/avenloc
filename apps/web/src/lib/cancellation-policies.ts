// Catalogue statique des politiques d'annulation avec leurs sous-règles
// détaillées (no-show, retard, dépassement de créneau) — même esprit que le
// prototype : ce sont des textes fixes liés au choix de politique, pas des
// champs configurables annonce par annonce.

export interface CancellationPolicyDetail {
  label: string;
  refund: string;
  noShow: string;
  lateArrival: string;
  overrun: string;
}

export const CANCELLATION_POLICY_DETAIL: Record<string, CancellationPolicyDetail> = {
  FLEXIBLE: {
    label: 'Flexible',
    refund: "Remboursement intégral jusqu'à 24h avant. Aucun remboursement après.",
    noShow: 'Facturation intégrale de la réservation.',
    lateArrival: 'Créneau raccourci d\'autant, sans remboursement de la portion manquée.',
    overrun: '15 € par tranche de 15 minutes au-delà du créneau réservé.',
  },
  MODERATE: {
    label: 'Modérée',
    refund: "Remboursement intégral jusqu'à 3 jours avant, 50 % jusqu'à 24h avant.",
    noShow: "Facturation à 100 %, avis automatique à l'hôte.",
    lateArrival: 'Tolérance de 15 min, puis créneau raccourci d\'autant.',
    overrun: '20 € par tranche de 15 minutes, prélevés sur la caution si applicable.',
  },
  STRICT: {
    label: 'Stricte',
    refund: 'Remboursement à 50 % jusqu\'à 7 jours avant. Aucun remboursement après.',
    noShow: 'Facturation intégrale + signalement pour vérification de compte.',
    lateArrival: 'Aucune tolérance, créneau raccourci dès la première minute.',
    overrun: '30 € par tranche de 15 minutes, réservation suivante prioritaire.',
  },
  NON_REFUNDABLE: {
    label: 'Non remboursable',
    refund: 'Aucun remboursement, quelle que soit la date d\'annulation.',
    noShow: 'Facturation intégrale de la réservation.',
    lateArrival: 'Créneau raccourci d\'autant, sans remboursement de la portion manquée.',
    overrun: '20 € par tranche de 15 minutes au-delà du créneau réservé.',
  },
};

export function cancellationPolicyDetail(policy: string): CancellationPolicyDetail {
  return CANCELLATION_POLICY_DETAIL[policy] ?? CANCELLATION_POLICY_DETAIL.MODERATE;
}
