'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { EmptyState, PageHeader, PageLoader, StarRating } from '@/components/ui';
import { dateShort } from '@/lib/format';
import { useHostGuard } from '../use-host-guard';
import type { Review } from '@/lib/types';

export default function HostReviewsPage() {
  const { ready } = useHostGuard();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    api.reviews
      .byHost()
      .then(setReviews)
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [ready]);

  if (!ready || loading) return <PageLoader />;

  const average = reviews.length
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Avis"
        action={
          average !== null ? (
            <span className="text-sm font-semibold">
              ★ {average.toFixed(1)} · {reviews.length} avis
            </span>
          ) : undefined
        }
      />

      {reviews.length === 0 ? (
        <EmptyState icon="⭐" title="Aucun avis pour l'instant">
          Les avis de vos locataires apparaîtront ici une fois vos réservations terminées.
        </EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {reviews.map((r) => (
            <div key={r.id} className="card space-y-1.5 p-3.5">
              <div className="flex items-center justify-between">
                <StarRating value={r.rating} readOnly size={14} />
                <span className="text-xs text-muted">{dateShort(r.createdAt)}</span>
              </div>
              {r.listingTitle && (
                <Link
                  href={`/listings/${r.listingId}`}
                  className="block text-xs font-semibold text-brand-fg hover:underline"
                >
                  {r.listingTitle}
                </Link>
              )}
              {r.comment && <p className="text-sm text-ink/80">{r.comment}</p>}
              {r.criteria && <p className="text-xs text-muted">Critères évalués : {r.criteria}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
