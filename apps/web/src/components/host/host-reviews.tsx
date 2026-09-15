'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { StarRating } from '@/components/ui';
import type { Listing, Review } from '@/lib/types';

interface ReviewRow extends Review {
  listingTitle: string;
}

// Avis reçus par l'hôte, agrégés sur toutes ses annonces — voir HostReviews
// dans le design de référence. Pas d'endpoint dédié côté API : on agrège
// depuis GET /listings/:id/reviews pour chaque annonce de l'hôte.
export default function HostReviews() {
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    api.listings
      .mine()
      .then(async (listings: Listing[]) => {
        const perListing = await Promise.all(
          listings.map((l) =>
            api.reviews
              .byListing(l.id)
              .then((r) => r.reviews.map((rev) => ({ ...rev, listingTitle: l.title })))
              .catch(() => []),
          ),
        );
        const all = perListing.flat().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        if (alive) setReviews(all);
      })
      .catch(() => alive && setReviews([]));
    return () => {
      alive = false;
    };
  }, []);

  if (reviews === null) {
    return <p className="py-6 text-center text-sm text-muted">Chargement…</p>;
  }

  if (reviews.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-muted">
        Aucun avis reçu pour le moment.
      </div>
    );
  }

  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Note moyenne : <strong className="text-ink">{avg.toFixed(1)} / 5</strong> sur {reviews.length} avis
      </p>
      <div className="space-y-2.5">
        {reviews.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold">
                  {r.listingTitle}
                  {r.author && (
                    <span className="font-normal text-muted">
                      {' '}
                      · {r.author.firstName} {r.author.lastName}
                    </span>
                  )}
                </p>
                <StarRating value={r.rating} readOnly size={13} />
              </div>
              <span className="flex-none text-xs text-muted">
                {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </span>
            </div>
            {r.comment && <p className="mt-2 text-sm text-ink/80">{r.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
