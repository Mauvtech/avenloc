'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { saveTokens } from '@/lib/auth';

type Role = 'TENANT' | 'HOST';

const ROLE_OPTIONS: { value: Role; title: string; desc: string }[] = [
  { value: 'TENANT', title: 'Je réserve des espaces', desc: 'Trouver et louer des locaux' },
  { value: 'HOST', title: 'Je propose mes espaces', desc: 'Publier des annonces et percevoir des revenus' },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<Role>(searchParams.get('role') === 'host' ? 'HOST' : 'TENANT');
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
      router.push(role === 'HOST' ? '/host' : '/');
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
      <div className="mb-7 flex items-center justify-center gap-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded bg-brand text-[15px] font-extrabold text-white">
          A
        </span>
        <span className="text-lg font-bold">Aven</span>
      </div>

      <div className="card overflow-hidden">
        <div className="flex border-b border-line">
          <Link href="/auth/login" className={`${tab} bg-canvas text-muted hover:text-ink`}>
            Connexion
          </Link>
          <span className={`${tab} bg-white text-ink`}>Inscription</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
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
          {error && <p className="text-sm text-red-500">{error}</p>}
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
        <Link href="/auth/login" className="font-semibold">
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
