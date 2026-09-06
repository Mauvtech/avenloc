'use client';

import { useEffect, useRef, useState } from 'react';
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

interface LinkDef {
  href: string;
  label: string;
  hostOnly?: boolean;
  badge?: number;
}

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // dropdown avatar (desktop)
  const [drawerOpen, setDrawerOpen] = useState(false); // panneau plein écran (mobile)
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Ferme les surcouches à chaque navigation.
  useEffect(() => {
    setMenuOpen(false);
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  async function handleLogout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) await api.auth.logout(refreshToken).catch(() => {});
    clearTokens();
    setUser(null);
    setMenuOpen(false);
    setDrawerOpen(false);
    router.push('/');
    router.refresh();
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(href));

  const links: LinkDef[] = user
    ? [
        { href: '/host', label: 'Espace hôte', hostOnly: true },
        { href: '/wishlist', label: 'Favoris' },
        { href: '/bookings', label: 'Réservations' },
        { href: '/conversations', label: 'Messages', badge: unread },
      ].filter((l) => !l.hostOnly || user.roles.includes('HOST'))
    : [];

  const NavLink = ({ href, label, badge }: LinkDef) => (
    <Link
      href={href}
      className={`relative rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors ${
        isActive(href) ? 'bg-canvas text-ink' : 'text-muted hover:bg-canvas hover:text-ink'
      }`}
    >
      {label}
      {badge ? (
        <span className="absolute -right-0.5 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <Logo />

        {/* ── Desktop ─────────────────────────────────────────────── */}
        <div className="hidden min-h-[36px] items-center gap-1 md:flex">
          {!mounted ? null : user ? (
            <>
              {links.map((l) => (
                <NavLink key={l.href} {...l} />
              ))}
              <div ref={menuRef} className="relative ml-1.5">
                <button
                  onClick={() => setMenuOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-full p-0.5 ring-2 ring-transparent transition-all hover:ring-line"
                  aria-label="Menu du compte"
                  aria-expanded={menuOpen}
                >
                  <Avatar src={user.avatarUrl} name={`${user.firstName} ${user.lastName}`} size={32} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-52 animate-slide-up overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-modal">
                    <div className="border-b border-line px-3 py-2">
                      <p className="truncate text-sm font-bold">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="truncate text-xs text-muted">{user.email}</p>
                    </div>
                    <MenuItem href="/profile" label="Mon profil" />
                    {user.roles.includes('HOST') ? (
                      <MenuItem href="/host" label="Espace hôte" />
                    ) : (
                      <MenuItem href="/listings/new" label="Publier un espace" />
                    )}
                    <button
                      onClick={handleLogout}
                      className="block w-full px-3 py-2 text-left text-sm font-semibold text-muted hover:bg-canvas hover:text-danger-fg"
                    >
                      Déconnexion
                    </button>
                  </div>
                )}
              </div>
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

        {/* ── Mobile ──────────────────────────────────────────────── */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-canvas md:hidden"
          aria-label="Ouvrir le menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          {mounted && unread > 0 && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-brand" />
          )}
        </button>
      </div>

      {/* ── Panneau mobile ────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-xs animate-slide-up flex-col bg-surface shadow-modal">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <Logo />
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-canvas hover:text-ink"
                aria-label="Fermer le menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>

            {!mounted ? null : user ? (
              <div className="flex flex-1 flex-col overflow-y-auto">
                <Link
                  href="/profile"
                  className="flex items-center gap-3 border-b border-line px-4 py-3.5 hover:bg-canvas"
                >
                  <Avatar src={user.avatarUrl} name={`${user.firstName} ${user.lastName}`} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="truncate text-xs text-muted">Voir mon profil</p>
                  </div>
                </Link>
                <nav className="flex flex-col p-2">
                  {links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={`flex items-center justify-between rounded-md px-3 py-2.5 text-sm font-semibold ${
                        isActive(l.href) ? 'bg-canvas text-ink' : 'text-muted hover:bg-canvas hover:text-ink'
                      }`}
                    >
                      {l.label}
                      {l.badge ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[11px] font-bold text-white">
                          {l.badge > 9 ? '9+' : l.badge}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                  {!user.roles.includes('HOST') && (
                    <Link
                      href="/listings/new"
                      className="rounded-md px-3 py-2.5 text-sm font-semibold text-muted hover:bg-canvas hover:text-ink"
                    >
                      Publier un espace
                    </Link>
                  )}
                </nav>
                <button
                  onClick={handleLogout}
                  className="mt-auto border-t border-line px-4 py-3.5 text-left text-sm font-semibold text-muted hover:text-danger-fg"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 p-4">
                <Link href="/auth/register" className="btn-primary w-full">
                  S&apos;inscrire
                </Link>
                <Link href="/auth/login" className="btn-ghost w-full">
                  Se connecter
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function MenuItem({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 text-sm font-semibold text-ink hover:bg-canvas"
    >
      {label}
    </Link>
  );
}
