'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, loginHref } from '@/lib/auth';
import { BackLink } from '@/components/ui';
import SpaceWizard from '@/components/space-wizard';

export default function NewListingPage() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated()) router.replace(loginHref(pathname));
  }, [router, pathname]);

  return (
    <div className="space-y-4">
      <BackLink href="/host">Retour à mes annonces</BackLink>
      <SpaceWizard context="host" />
    </div>
  );
}
