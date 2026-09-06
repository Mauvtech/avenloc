'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { ListingPhoto } from '@/lib/types';

interface Props {
  listingId: string;
  initialPhotos: ListingPhoto[];
}

export default function ListingPhotos({ listingId, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<ListingPhoto[]>(
    [...initialPhotos].sort((a, b) => a.position - b.position),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files) return;
    const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (imgs.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of imgs) {
        const created = await api.listings.uploadPhoto(listingId, file);
        setPhotos((p) => [...p, created]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec du téléversement');
    } finally {
      setBusy(false);
    }
  }

  async function remove(photoId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.listings.deletePhoto(listingId, photoId);
      setPhotos((p) => p.filter((x) => x.id !== photoId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-canvas py-6 text-center text-sm text-muted transition-colors hover:border-brand hover:text-ink">
        <span className="font-semibold">{busy ? 'Envoi…' : 'Ajouter des photos'}</span>
        <span className="text-xs">JPG / PNG · 10 Mo max</span>
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={busy}
          className="hidden"
          onChange={(e) => {
            upload(e.target.files);
            e.target.value = '';
          }}
        />
      </label>

      {error && <p className="text-sm text-danger-fg">{error}</p>}

      {photos.length > 0 ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo, i) => (
            <div key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt={photo.caption ?? ''} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-surface/90 px-1.5 py-0.5 text-[10px] font-bold text-ink shadow-card">
                  Couverture
                </span>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() => remove(photo.id)}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-surface/90 text-sm font-bold text-ink shadow-card"
                aria-label="Supprimer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Aucune photo pour le moment.</p>
      )}
    </div>
  );
}
