'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Avatar from '@/components/avatar';
import { Skeleton } from '@/components/ui';

type PublicProfile = Awaited<ReturnType<typeof api.users.publicProfile>>;

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.users
      .publicProfile(id)
      .then(setProfile)
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (!profile) return null;

  const name = `${profile.firstName} ${profile.lastName}`.trim();
  const since = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <button onClick={() => router.back()} className="text-sm text-muted hover:text-ink">
        ← Retour
      </button>

      <div className="flex items-center gap-4">
        <Avatar src={profile.avatarUrl} name={name} size={72} />
        <div>
          <h1 className="text-2xl font-extrabold">{name}</h1>
          {since && <p className="text-sm text-muted">Membre depuis {since}</p>}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="section-title mb-2">À propos</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
          {profile.bio || <span className="text-muted">Cet utilisateur n’a pas encore ajouté de bio.</span>}
        </p>
      </div>
    </div>
  );
}
