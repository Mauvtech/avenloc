'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { clearTokens, getRefreshToken, isAuthenticated, loginHref, registerHref } from '@/lib/auth';
import { api } from '@/lib/api';
import Avatar from '@/components/avatar';
import type { User } from '@/lib/types';

function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-baseline gap-1.5" aria-label="Sppot by Aven — Accueil">
      <span className="font-display text-xl font-bold tracking-[-0.01em]">Sppot</span>
      <span className="text-[13px] font-medium text-muted">by Aven</span>
    </Link>
  );
}

interface LinkDef {
  href: string;
  label: string;
  requiresRole?: 'HOST' | 'COMMERCIAL';
  badge?: number;
}

export default function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(0);
  const [authDestination, setAuthDestination] = useState('');
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // dropdown avatar (desktop)
  const [drawerOpen, setDrawerOpen] = useState(false); // panneau plein écran (mobile)
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Identité : (re)chargée quand on est authentifié sans profil en mémoire
  // (montage, ou juste après login qui navigue vers une nouvelle route).
  useEffect(() => {
    if (!isAuthenticated()) {
      setUser(null);
      return;
    }
    if (user) return;
    api.auth.me().then(setUser).catch(() => {
      clearTokens();
      setUser(null);
    });
  }, [pathname, user]);

  // Compteur de messages non lus : rafraîchi à chaque navigation (léger).
  useEffect(() => {
    if (!isAuthenticated()) {
      setUnread(0);
      return;
    }
    api.conversations
      .list()
      .then((cs) => setUnread(cs.reduce((n, c) => n + (c.unreadCount ?? 0), 0)))
      .catch(() => setUnread(0));
  }, [pathname]);

  // Ferme les surcouches à chaque navigation.
  useEffect(() => {
    setMenuOpen(false);
    setDrawerOpen(false);
    setAuthDestination(new URLSearchParams(window.location.search).get('next') ?? '');
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

  useEffect(() => {
    if (!drawerOpen && !menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen, menuOpen]);

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
    pathname === href || (href !== '/' && pathname.startsWith(href)) || (pathname.startsWith('/auth') && authDestination.startsWith(href));

  const allLinks: LinkDef[] = [
    { href: '/host', label: 'Espace hôte', requiresRole: 'HOST' },
    { href: '/commercial', label: 'Espace commercial', requiresRole: 'COMMERCIAL' },
    { href: '/wishlist', label: 'Favoris' },
    { href: '/bookings', label: 'Réservations' },
    { href: '/conversations', label: 'Messages', badge: unread },
  ];
  const links: LinkDef[] = user
    ? allLinks.filter((l) => !l.requiresRole || user.roles.includes(l.requiresRole))
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
    <header className="relative z-40 border-b border-line bg-surface">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-2.5 px-5 py-4">
        <Logo />

        <nav aria-label="Espaces" className="role-switcher ml-auto flex gap-1 rounded bg-canvas p-[3px]">
          {[{ href: '/bookings', label: 'Espace client' }, { href: '/host', label: 'Espace hôte' }, { href: '/commercial', label: 'Commercial' }].map(({ href, label }) => (
            <Link key={href} href={mounted && user ? href : loginHref(href)}
              className={`rounded-[6px] px-3.5 py-[7px] text-[13px] font-medium ${isActive(href) ? 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-muted hover:text-ink'}`}>
              {label}
            </Link>
          ))}
        </nav>

        {/* ── Desktop ─────────────────────────────────────────────── */}
        <div className="hidden items-center gap-1 md:flex">
          {!mounted ? null : user ? (
            <>
              {links.filter((l) => !l.requiresRole && l.href !== "/bookings").map((l) => (
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
                    {user.roles.includes('HOST') && <MenuItem href="/host" label="Espace hôte" />}
                    {user.roles.includes('COMMERCIAL') && (
                      <MenuItem href="/commercial" label="Espace commercial" />
                    )}
                    {!user.roles.includes('HOST') && (
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
          ) : null
          }
        </div>

        {/* ── Mobile ──────────────────────────────────────────────── */}
        {mounted && user && <button
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
        </button>}
      </div>

      {/* ── Panneau mobile ────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setDrawerOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute right-0 top-0 flex h-full w-[82%] max-w-xs animate-slide-up flex-col bg-surface shadow-modal"
          >
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
                <Link href={registerHref(pathname)} className="btn-primary w-full">
                  S&apos;inscrire
                </Link>
                <Link href={loginHref(pathname)} className="btn-ghost w-full">
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
