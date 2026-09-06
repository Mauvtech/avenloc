'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveTokens } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export default function LoginPage() {
  const router = useRouter();
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
      router.push('/');
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
      <div className="mb-7 flex items-center justify-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-[15px] font-extrabold text-white">
          A
        </span>
        <span className="text-lg font-bold">Aven</span>
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-line">
          <span className={`${tab} bg-surface text-ink`}>Connexion</span>
          <Link href="/auth/register" className={`${tab} bg-canvas text-muted hover:text-ink`}>
            Inscription
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 p-6">
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

          <a href={`${API_URL}/auth/google`} className="btn-ghost w-full">
            Continuer avec Google
          </a>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-muted">
        Pas encore de compte ?{' '}
        <Link href="/auth/register" className="font-semibold">
          S&apos;inscrire
        </Link>
      </p>
    </div>
  );
}
