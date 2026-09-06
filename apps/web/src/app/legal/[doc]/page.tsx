import { notFound } from 'next/navigation';
import { BackLink } from '@/components/ui';

const DOCS: Record<string, { title: string; body: string[] }> = {
  terms: {
    title: 'Conditions générales d’utilisation',
    body: [
      'Aven met en relation des hôtes proposant des espaces (logements, bureaux, salles, ateliers, entrepôts, parkings) et des locataires souhaitant les réserver pour une durée déterminée.',
      'En créant un compte, vous vous engagez à fournir des informations exactes et à respecter la réglementation applicable à la mise à disposition de votre bien.',
      'Aven agit en qualité d’intermédiaire technique et n’est pas partie au contrat de location conclu entre l’hôte et le locataire. Les paiements sont opérés via notre prestataire Stripe ; Aven perçoit une commission de service sur chaque réservation.',
      'Toute annonce frauduleuse, tout contenu illicite ou tout comportement portant préjudice à un autre utilisateur peut entraîner la suspension du compte.',
      'Document synthétique fourni à titre indicatif dans le cadre du MVP — une version juridique complète sera publiée avant l’ouverture commerciale.',
    ],
  },
  privacy: {
    title: 'Politique de confidentialité',
    body: [
      'Nous collectons les données strictement nécessaires au fonctionnement du service : identité, email, téléphone, photo de profil, historique de réservations et de messages, et données de paiement (traitées et stockées par Stripe, jamais par Aven).',
      'Ces données sont utilisées pour : authentifier votre compte, traiter les réservations et paiements, permettre la communication entre hôte et locataire, et prévenir la fraude.',
      'Vous disposez d’un droit d’accès, de rectification et de suppression de vos données. Écrivez-nous depuis votre espace compte.',
      'Aucune donnée n’est revendue à des tiers. Les sous-traitants techniques (hébergement, paiement, email) sont soumis à des engagements de confidentialité.',
      'Document synthétique fourni à titre indicatif dans le cadre du MVP.',
    ],
  },
  cancellation: {
    title: 'Politique d’annulation',
    body: [
      'Chaque annonce précise une politique d’annulation choisie par l’hôte : Flexible, Modérée, Stricte ou Non remboursable.',
      'Flexible : remboursement intégral jusqu’à 24 h avant l’arrivée.',
      'Modérée : remboursement intégral jusqu’à 5 jours avant l’arrivée, puis 50 %.',
      'Stricte : remboursement de 50 % jusqu’à 7 jours avant l’arrivée, aucun remboursement ensuite.',
      'Non remboursable : aucun remboursement, tarif réduit.',
      'Les frais de service Aven ne sont pas remboursables. Un hôte peut toujours accepter un remboursement au-delà de sa politique.',
      'Document synthétique fourni à titre indicatif dans le cadre du MVP.',
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export default function LegalPage({ params }: { params: { doc: string } }) {
  const doc = DOCS[params.doc];
  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <BackLink href="/">Accueil</BackLink>
      <h1 className="text-2xl font-extrabold">{doc.title}</h1>
      <div className="space-y-4">
        {doc.body.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-ink/80">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}
