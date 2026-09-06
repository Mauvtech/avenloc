'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { clearTokens, getRefreshToken, isAuthenticated } from '@/lib/auth';
import { api } from '@/lib/api';
import Avatar from '@/components/avatar';
import type { User } from '@/lib/types';

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-[15px] font-extrabold text-white shadow-xs">
        A
      </span>
      <span className="text-[17px] font-extrabold tracking-tight">Aven</span>
    </Link>
  );
}

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated()) {
      api.auth.me().then(setUser).catch(() => {
        clearTokens();
        setUser(null);
      });
      api.conversations
        .list()
        .then((cs) => setUnread(cs.reduce((n, c) => n + (c.unreadCount ?? 0), 0)))
        .catch(() => setUnread(0));
    } else {
      setUser(null);
      setUnread(0);
    }
  }, [pathname]);

  async function handleLogout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) await api.auth.logout(refreshToken).catch(() => {});
    clearTokens();
    setUser(null);
    router.push('/');
    router.refresh();
  }

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const activeExact = pathname === href;
    const active = activeExact || (href !== '/' && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`relative rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors ${
          active ? 'bg-canvas text-ink' : 'text-muted hover:bg-canvas hover:text-ink'
        }`}
      >
        {children}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 sm:px-6">
        <Logo />

        <div className="flex min-h-[36px] items-center gap-1">
          {!mounted ? null : user ? (
            <>
              {user.roles.includes('HOST') && <NavLink href="/host">Espace hôte</NavLink>}
              <NavLink href="/wishlist">Favoris</NavLink>
              <NavLink href="/bookings">Réservations</NavLink>
              <span className="relative">
                <NavLink href="/conversations">Messages</NavLink>
                {unread > 0 && (
                  <span className="absolute right-1 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </span>
              <Link
                href="/profile"
                title={`${user.firstName} ${user.lastName}`}
                className="ml-1.5 rounded-full ring-2 ring-transparent transition-all hover:ring-line"
              >
                <Avatar src={user.avatarUrl} name={`${user.firstName} ${user.lastName}`} size={34} />
              </Link>
              <button
                onClick={handleLogout}
                className="ml-1 rounded-md px-2 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-danger-fg"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link href="/auth/login" className="btn-ghost btn-sm">
                Se connecter
              </Link>
              <Link href="/auth/register" className="btn-primary btn-sm">
                S&apos;inscrire
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
