'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(email);
      setDevUrl(res.devResetUrl ?? null);
      setSent(true);
    } catch {
      setSent(true); // réponse neutre : on n'expose pas l'existence du compte
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 py-8">
      <div className="text-center">
        <h1 className="text-2xl font-extrabold">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-muted">
          Indiquez votre email, nous vous enverrons un lien de réinitialisation.
        </p>
      </div>

      {sent ? (
        <div className="card space-y-3 p-6 text-sm">
          <p className="font-semibold text-success-fg">
            ✓ Si un compte existe pour <span className="font-mono">{email}</span>, un lien vient
            d&apos;être envoyé.
          </p>
          {devUrl && (
            <p className="rounded-md bg-warn-tint p-3 text-warn-fg">
              Mode dev — lien de test :{' '}
              <Link href={devUrl.replace(/^https?:\/\/[^/]+/, '')} className="font-semibold underline">
                réinitialiser
              </Link>
            </p>
          )}
          <Link href="/auth/login" className="btn-ghost w-full">
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
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
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Envoi…' : 'Envoyer le lien'}
          </button>
          <p className="text-center text-sm text-muted">
            <Link href="/auth/login" className="font-semibold">
              Retour
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
