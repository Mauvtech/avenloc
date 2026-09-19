import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated, loginHref } from '@/lib/auth';

/** Garde d'accès partagée par les écrans /commercial : redirige si non
 * connecté ou sans le rôle Commercial. */
export function useCommercialGuard(): { ready: boolean } {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(loginHref(pathname));
      return;
    }
    api.auth
      .me()
      .then((me) => {
        if (!me.roles.includes('COMMERCIAL')) {
          router.replace('/');
          return;
        }
        setReady(true);
      })
      .catch(() => router.replace(loginHref(pathname)));
  }, [router, pathname]);

  return { ready };
}
