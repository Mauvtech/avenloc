'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { clearTokens, getRefreshToken, isAuthenticated } from '@/lib/auth';
import Avatar from '@/components/avatar';
import type { User } from '@/lib/types';

const ROLE_LABEL: Record<string, string> = {
  TENANT: 'Locataire',
  HOST: 'Hôte',
  ADMIN: 'Admin',
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', bio: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [becomeHostLoading, setBecomeHostLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function hydrate(u: User) {
    setUser(u);
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      bio: u.bio ?? '',
      phone: u.phone ?? '',
    });
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/auth/login');
      return;
    }
    api.auth
      .me()
      .then(hydrate)
      .catch(() => router.replace('/auth/login'))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await api.users.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        bio: form.bio,
        phone: form.phone,
      });
      hydrate(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatar(file: File | undefined) {
    if (!file) return;
    setAvatarBusy(true);
    setError(null);
    try {
      hydrate(await api.users.uploadAvatar(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi de la photo impossible');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleBecomeHost() {
    setBecomeHostLoading(true);
    setError(null);
    try {
      hydrate(await api.users.becomeHost());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setBecomeHostLoading(false);
    }
  }

  async function handleLogout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) await api.auth.logout(refreshToken).catch(() => {});
    clearTokens();
    router.push('/');
    router.refresh();
  }

  if (loading) return <p className="py-16 text-center text-muted">Chargement…</p>;
  if (!user) return null;

  const isHost = user.roles.includes('HOST');
  const verified = user.identityStatus === 'VERIFIED';
  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar src={user.avatarUrl} name={fullName} size={72} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={avatarBusy}
            className="absolute -bottom-1 -right-1 rounded-full border border-line bg-white px-2 py-1 text-[11px] font-semibold shadow-card hover:bg-canvas"
          >
            {avatarBusy ? '…' : 'Photo'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleAvatar(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold">{fullName}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          {user.phone && <p className="text-sm text-muted">{user.phone}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {verified && (
          <span className="rounded bg-brand-tint px-2.5 py-1 text-xs font-bold text-brand-fg">
            ✓ Identité vérifiée
          </span>
        )}
        {user.roles.map((r) => (
          <span
            key={r}
            className="rounded border border-line px-2.5 py-1 text-xs font-semibold text-muted"
          >
            {ROLE_LABEL[r] ?? r}
          </span>
        ))}
        <span className="text-xs text-muted">
          · Membre depuis {new Date(user.createdAt).toLocaleDateString('fr-FR')}
        </span>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* Infos / édition */}
      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">Mes informations</h2>
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-sm font-semibold text-brand-fg">
              Modifier
            </button>
          )}
        </div>

        {editing ? (
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Prénom</label>
                <input
                  className="field"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Nom</label>
                <input
                  className="field"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="label">Téléphone</label>
              <input
                className="field"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+33 6 12 34 56 78"
              />
            </div>
            <div>
              <label className="label">Bio</label>
              <textarea
                className="field resize-y"
                rows={3}
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Quelques mots sur vous — utile pour rassurer hôtes et locataires."
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  hydrate(user);
                }}
                className="btn-ghost"
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-ink/80">
            {user.bio || <span className="text-muted">Aucune bio. Ajoutez-en une pour inspirer confiance.</span>}
          </p>
        )}
      </div>

      {/* Devenir hôte */}
      {!isHost && (
        <div className="card space-y-3 p-5">
          <h2 className="font-bold">Devenez hôte</h2>
          <p className="text-sm text-muted">Publiez vos espaces et commencez à percevoir des revenus.</p>
          <button onClick={handleBecomeHost} disabled={becomeHostLoading} className="btn-primary">
            {becomeHostLoading ? 'Activation…' : 'Devenir hôte'}
          </button>
        </div>
      )}

      {/* Liens rapides */}
      <div className="space-y-2">
        {isHost && (
          <Link href="/host" className="card block p-4 text-sm font-semibold transition-colors hover:bg-canvas">
            Tableau de bord hôte
          </Link>
        )}
        <Link href="/bookings" className="card block p-4 text-sm font-semibold transition-colors hover:bg-canvas">
          Mes réservations
        </Link>
        <Link href="/conversations" className="card block p-4 text-sm font-semibold transition-colors hover:bg-canvas">
          Mes messages
        </Link>
        <Link
          href={`/users/${user.id}`}
          className="card block p-4 text-sm font-semibold transition-colors hover:bg-canvas"
        >
          Voir mon profil public
        </Link>
      </div>

      <button
        onClick={handleLogout}
        className="w-full rounded border border-line py-3 text-sm font-semibold text-muted transition-colors hover:text-red-500"
      >
        Se déconnecter
      </button>
    </div>
  );
}
