import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';
import { isAuthenticated, loginHref } from '@/lib/auth';

/** Garde d'accès partagée par tous les onglets de /host : redirige si non
 * connecté ou non hôte, sinon signale que la page peut charger ses données. */
export function useHostGuard(): { ready: boolean } {
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
        if (!me.roles.includes('HOST')) {
          router.replace('/profile');
          return;
        }
        setReady(true);
      })
      .catch(() => router.replace(loginHref(pathname)));
  }, [router, pathname]);

  return { ready };
}
