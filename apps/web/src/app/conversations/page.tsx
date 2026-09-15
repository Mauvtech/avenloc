'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { isAuthenticated, loginHref } from '@/lib/auth';
import ConversationsPanel from '@/components/conversations-panel';
import { PageHeader } from '@/components/ui';

export default function ConversationsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace(loginHref(pathname));
      return;
    }
    setReady(true);
  }, [router, pathname]);

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader title="Messages" />
      <ConversationsPanel />
    </div>
  );
}
