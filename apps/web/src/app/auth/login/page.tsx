'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { registerHref, safeNext, saveTokens } from '@/lib/auth';

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

  const roleLabel = next?.startsWith('/host') ? 'Espace hôte' : next?.startsWith('/commercial') ? 'Espace commercial' : 'Espace client';
  return (
    <div className="auth-reference">
      <h1 className="mb-1.5 text-[22px] font-bold">{roleLabel}</h1>
      <p className="mb-6 text-[13px] text-muted">Connectez-vous ou créez un compte pour accéder à cet espace.</p>
      <div className="auth-tabs">
        <span className="auth-tab auth-tab-active">Se connecter</span>
        <Link href={registerHref(next)} className="auth-tab">Créer un compte</Link>
      </div>
      <a href={`${API_URL}/auth/google`} className="btn-ghost mb-5 w-full font-medium">Continuer avec Google</a>
      <div className="mb-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />ou<span className="h-px flex-1 bg-line" /></div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label htmlFor="email" className="mb-1.5 block text-[13px] text-muted">Email</label><input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" className="field" /></div>
        <div><label htmlFor="password" className="mb-1.5 block text-[13px] text-muted">Mot de passe</label><input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Votre mot de passe" className="field" /></div>
        {error && <p role="alert" className="text-sm text-danger-fg">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full py-3">{loading ? 'Connexion…' : 'Se connecter'}</button>
        <Link href="/auth/forgot" className="block text-center text-xs text-muted underline">Mot de passe oublié ?</Link>
      </form>
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
