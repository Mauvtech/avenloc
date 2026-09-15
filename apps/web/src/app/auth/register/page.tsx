'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { loginHref, safeNext, saveTokens } from '@/lib/auth';
import { Logo } from '@/components/nav';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type Role = 'TENANT' | 'HOST';

const ROLE_OPTIONS: { value: Role; title: string; desc: string }[] = [
  { value: 'TENANT', title: 'Je réserve des espaces', desc: 'Trouver et louer des locaux' },
  { value: 'HOST', title: 'Je propose mes espaces', desc: 'Publier des annonces et percevoir des revenus' },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [role, setRole] = useState<Role>(searchParams.get('role') === 'host' ? 'HOST' : 'TENANT');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { confirm: _confirm, ...payload } = form;
      const tokens = await api.auth.register({ ...payload, role });
      saveTokens(tokens.accessToken, tokens.refreshToken);
      router.push(next ?? (role === 'HOST' ? '/host' : '/'));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
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
          Créez votre compte pour continuer là où vous en étiez.
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="flex border-b border-line">
          <Link href={loginHref(next)} className={`${tab} bg-canvas text-muted hover:text-ink`}>
            Connexion
          </Link>
          <span className={`${tab} bg-surface text-ink`}>Inscription</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <a href={`${API_URL}/auth/google`} className="btn-ghost w-full">
            Continuer avec Google
          </a>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" />
            ou
            <span className="h-px flex-1 bg-line" />
          </div>

          {/* Choix du type de compte */}
          <div className="space-y-2">
            {ROLE_OPTIONS.map((opt) => {
              const active = role === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRole(opt.value)}
                  className={`flex w-full items-start gap-3 rounded border p-3 text-left transition-colors ${
                    active ? 'border-brand bg-brand-tint/60' : 'border-line hover:bg-canvas'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full border ${
                      active ? 'border-brand' : 'border-line'
                    }`}
                  >
                    {active && <span className="h-2 w-2 rounded-full bg-brand" />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{opt.title}</span>
                    <span className="block text-xs text-muted">{opt.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom</label>
              <input type="text" required value={form.firstName} onChange={set('firstName')} className="field" />
            </div>
            <div>
              <label className="label">Nom</label>
              <input type="text" required value={form.lastName} onChange={set('lastName')} className="field" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" required value={form.email} onChange={set('email')} className="field" />
          </div>
          <div>
            <label className="label">
              Mot de passe <span className="font-normal text-muted">(8 caractères min)</span>
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={set('password')}
              className="field"
            />
          </div>
          <div>
            <label className="label">Confirmer le mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              value={form.confirm}
              onChange={set('confirm')}
              className="field"
            />
          </div>
          {error && <p className="text-sm text-danger-fg">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading
              ? 'Chargement…'
              : role === 'HOST'
                ? 'Créer mon compte hôte'
                : 'Créer mon compte'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-center text-sm text-muted">
        Déjà un compte ?{' '}
        <Link href={loginHref(next)} className="font-semibold">
          Se connecter
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-muted">Chargement…</div>}>
      <RegisterForm />
    </Suspense>
  );
}
