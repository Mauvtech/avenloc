'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { registerHref, safeNext, saveTokens } from '@/lib/auth';
import { Logo } from '@/components/nav';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await api.auth.login({ email, password });
      saveTokens(tokens.accessToken, tokens.refreshToken);
      router.push(next ?? '/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  const tab = 'flex-1 px-4 py-3 text-center text-sm font-semibold transition-colors';

  return (
    <div className="mx-auto max-w-sm py-6">
      <div className="mb-7 flex items-center justify-center">
        <Logo />
      </div>

      {next && (
        <p className="mb-4 rounded-md bg-brand-tint px-3 py-2 text-center text-sm text-brand-fg">
          Connectez-vous pour continuer là où vous en étiez.
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="flex border-b border-line">
          <span className={`${tab} bg-surface text-ink`}>Connexion</span>
          <Link href={registerHref(next)} className={`${tab} bg-canvas text-muted hover:text-ink`}>
            Inscription
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 p-6">
          <a href={`${API_URL}/auth/google`} className="btn-ghost w-full">
            Continuer avec Google
          </a>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            ou
            <span className="h-px flex-1 bg-line" />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="label mb-0">Mot de passe</label>
              <Link href="/auth/forgot" className="text-xs font-semibold text-brand-fg">
                Oublié ?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
            />
          </div>
          {error && <p className="text-sm text-danger-fg">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Chargement…' : 'Se connecter'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-muted">
        Pas encore de compte ?{' '}
        <Link href={registerHref(next)} className="font-semibold">
          S&apos;inscrire
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted">Chargement…</div>}>
      <LoginForm />
    </Suspense>
  );
}
