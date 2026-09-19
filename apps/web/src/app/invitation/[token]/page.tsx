'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveTokens } from '@/lib/auth';
import { PageLoader } from '@/components/ui';
import type { HostInvitation } from '@/lib/types';

export default function InvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [invitation, setInvitation] = useState<HostInvitation | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.commercial
      .invitationPreview(token)
      .then(setInvitation)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password !== confirmPwd) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const tokens = await api.commercial.acceptInvitation(token, password);
      saveTokens(tokens.accessToken, tokens.refreshToken);
      router.push('/host/spaces');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation impossible');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <PageLoader />;

  if (notFound || !invitation) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-extrabold">Invitation introuvable</h1>
        <p className="mt-2 text-sm text-muted">Ce lien n&apos;est plus valide ou a déjà été utilisé.</p>
      </div>
    );
  }

  if (invitation.status === 'ACCEPTED') {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="text-xl font-extrabold">Compte déjà activé</h1>
        <p className="mt-2 text-sm text-muted">Connectez-vous normalement pour accéder à votre espace hôte.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-10">
      <div>
        <h1 className="text-2xl font-extrabold">Activez votre compte hôte</h1>
        <p className="mt-2 text-sm text-muted">
          Notre équipe a préparé une fiche pour <strong>{invitation.establishment?.name}</strong>
          {invitation.listing?.title && <> — annonce « {invitation.listing.title} »</>}. Créez votre
          mot de passe pour la relire et la publier.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-4 p-5">
        <div>
          <label className="label">Email</label>
          <input value={invitation.hostEmail} disabled className="field opacity-60" />
        </div>
        <div>
          <label className="label">Mot de passe</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
            placeholder="8 caractères minimum"
          />
        </div>
        <div>
          <label className="label">Confirmer le mot de passe</label>
          <input
            type="password"
            required
            value={confirmPwd}
            onChange={(e) => setConfirmPwd(e.target.value)}
            className="field"
          />
        </div>
        {error && <p className="text-sm text-danger-fg">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary btn-lg w-full">
          {submitting ? 'Activation…' : 'Activer mon compte'}
        </button>
      </form>
    </div>
  );
}
