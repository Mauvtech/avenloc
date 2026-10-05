'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useToast } from '@/components/toast';

function ResetForm() {
  const router = useRouter();
  const toast = useToast();
  const token = useSearchParams().get('token') ?? '';
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await api.auth.resetPassword(token, pw);
      toast.success('Mot de passe mis à jour. Connectez-vous.');
      router.push('/auth/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lien invalide ou expiré.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="card p-6 text-center text-sm text-muted">
        Lien invalide.{' '}
        <Link href="/auth/forgot" className="font-semibold text-brand-fg">
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-4 p-6">
      <div>
        <label className="label">Nouveau mot de passe</label>
        <input
          type="password"
          required
          minLength={8}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="field"
        />
        <p className="hint">8 caractères minimum.</p>
      </div>
      <div>
        <label className="label">Confirmer</label>
        <input
          type="password"
          required
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          className="field"
        />
      </div>
      {error && <p className="text-sm text-danger-fg">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? 'Enregistrement…' : 'Réinitialiser'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-sm space-y-6 py-8">
      <h1 className="text-center text-2xl font-extrabold">Nouveau mot de passe</h1>
      <Suspense fallback={<div className="card h-48" />}>
        <ResetForm />
      </Suspense>
    </div>
  );
}
