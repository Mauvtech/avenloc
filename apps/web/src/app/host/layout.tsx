'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS: { href: string; label: string }[] = [
  { href: '/host', label: 'Tableau de bord' },
  { href: '/host/spaces', label: 'Établissements & espaces' },
  { href: '/host/reservations', label: 'Réservations' },
  { href: '/host/reviews', label: 'Avis' },
  { href: '/host/messages', label: 'Messagerie' },
  { href: '/host/finances', label: 'Finances' },
];

export default function HostLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-7">
      <nav className="-mx-4 flex gap-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0">
        {TABS.map((tab) => {
          const active = tab.href === '/host' ? pathname === '/host' : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap border-b-2 py-3 text-sm font-medium transition-colors ${
                active ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
