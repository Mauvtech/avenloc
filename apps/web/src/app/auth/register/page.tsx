'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { loginHref, safeNext, saveTokens } from '@/lib/auth';

type Role = 'TENANT' | 'HOST';

const ROLE_OPTIONS: { value: Role; title: string; desc: string }[] = [
  { value: 'TENANT', title: 'Je réserve des espaces', desc: 'Trouver et louer des locaux' },
  { value: 'HOST', title: 'Je propose mes espaces', desc: 'Publier des annonces et percevoir des revenus' },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const [role, setRole] = useState<Role>(searchParams.get('role') === 'host' || next?.startsWith('/host') ? 'HOST' : 'TENANT');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tokens = await api.auth.register({ ...form, role });
      saveTokens(tokens.accessToken, tokens.refreshToken);
      router.push(next ?? (role === 'HOST' ? '/host' : '/'));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  }

  const roleLabel = next?.startsWith('/commercial') ? 'Espace commercial' : role === 'HOST' ? 'Espace hôte' : 'Espace client';
  return (
    <div className="auth-reference">
      <h1 className="mb-1.5 text-[22px] font-bold">{roleLabel}</h1>
      <p className="mb-6 text-[13px] text-muted">Connectez-vous ou créez un compte pour accéder à cet espace.</p>
      <div className="auth-tabs">
        <Link href={loginHref(next)} className="auth-tab">Se connecter</Link>
        <span className="auth-tab auth-tab-active">Créer un compte</span>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
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
          {error && <p className="text-sm text-danger-fg">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading
              ? 'Chargement…'
              : role === 'HOST'
                ? 'Créer mon compte hôte'
                : 'Créer mon compte'}
          </button>
      </form>

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
