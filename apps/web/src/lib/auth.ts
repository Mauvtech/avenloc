export function saveTokens(access: string, refresh: string): void {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
}

export function clearTokens(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken');
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken');
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('accessToken');
}

// Valide qu'une destination de retour post-connexion est une route interne sûre
// (pas de protocole/hôte externe — évite l'open redirect via ?next=).
export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

/** URL de connexion, avec retour automatique vers `next` une fois connecté. */
export function loginHref(next?: string | null): string {
  const safe = safeNext(next);
  return safe ? `/auth/login?next=${encodeURIComponent(safe)}` : '/auth/login';
}

/** URL d'inscription, avec retour automatique vers `next` une fois le compte créé. */
export function registerHref(next?: string | null): string {
  const safe = safeNext(next);
  return safe ? `/auth/register?next=${encodeURIComponent(safe)}` : '/auth/register';
}
