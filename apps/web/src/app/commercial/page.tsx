'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, loginHref } from '@/lib/auth';
import { PageLoader } from '@/components/ui';
import SpaceWizard, { type SpaceWizardResult } from '@/components/space-wizard';

export default function CommercialPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [submitted, setSubmitted] = useState<SpaceWizardResult | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(loginHref(pathname));
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) return <PageLoader />;

  if (submitted) {
    return (
      <div className="mx-auto max-w-md space-y-5 py-10 text-center">
        <span className="badge">Fiche envoyée</span>
        <h1 className="text-xl font-extrabold">
          Envoyée à {submitted.hostName || "l'hôte"} pour validation
        </h1>
        <p className="text-sm text-muted">
          {submitted.establishment && (
            <>
              Établissement : {submitted.establishment}
              <br />
            </>
          )}
          L&apos;hôte recevra une notification et pourra publier la fiche en un clic après vérification.
        </p>

        {submitted.isNewHost && submitted.devActivationUrl && (
          <div className="card space-y-3 p-4 text-left text-sm">
            <p className="text-xs text-muted">
              Aucun compte n&apos;existait pour <span className="font-mono">{submitted.hostEmail}</span> — un
              email d&apos;invitation est envoyé automatiquement.
            </p>
            <div className="rounded-md border border-line p-3">
              <p className="mb-2 text-xs font-semibold text-muted">Aperçu de l&apos;email reçu par l&apos;hôte</p>
              <p className="text-xs text-muted">
                À : <span className="font-mono">{submitted.hostEmail}</span>
              </p>
              <p className="mt-1.5 font-bold">
                Votre espace « {submitted.listing.title} » est prêt à être publié
              </p>
              <p className="mt-1 text-muted">
                Bonjour {submitted.hostName}, une fiche a été créée pour vous suite à la visite de
                notre commercial. Choisissez un mot de passe pour activer votre compte et la valider.
              </p>
              <a
                href={`${submitted.devActivationUrl.replace(/^https?:\/\/[^/]+/, '')}&name=${encodeURIComponent(
                  submitted.hostName,
                )}&space=${encodeURIComponent(submitted.listing.title)}`}
                className="btn-primary mt-3 w-full justify-center"
              >
                Choisir mon mot de passe →
              </a>
            </div>
          </div>
        )}

        <button onClick={() => setSubmitted(null)} className="btn-primary">
          Créer une autre fiche
        </button>
      </div>
    );
  }

  return <SpaceWizard context="commercial" onCreated={setSubmitted} />;
}
