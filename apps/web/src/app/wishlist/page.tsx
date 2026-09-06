'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getWishlist, onWishlistChange } from '@/lib/wishlist';
import ListingCard from '@/components/listing-card';
import { EmptyState, ListingCardSkeleton, PageHeader } from '@/components/ui';
import type { Listing, SearchResultItem } from '@/lib/types';

function toItem(l: Listing): SearchResultItem {
  return {
    id: l.id,
    title: l.title,
    type: l.type,
    city: l.city,
    latitude: l.latitude,
    longitude: l.longitude,
    distanceKm: 0,
    basePrice: Number(l.basePrice),
    pricingUnit: l.pricingUnit,
    maxGuests: l.maxGuests,
    amenities: l.amenities,
    coverPhotoUrl: l.photos[0]?.url ?? null,
    rating: null,
    reviewCount: 0,
  };
}

export default function WishlistPage() {
  const [items, setItems] = useState<SearchResultItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () => {
      const ids = getWishlist();
      if (ids.length === 0) {
        if (alive) setItems([]);
        return;
      }
      Promise.all(ids.map((id) => api.listings.getById(id).catch(() => null))).then((ls) => {
        if (alive) setItems(ls.filter((l): l is Listing => !!l).map(toItem));
      });
    };
    load();
    return onWishlistChange(load);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Favoris" subtitle="Les espaces que vous avez sauvegardés" />
      {items === null ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon="♥"
          title="Aucun favori"
          action={
            <Link href="/" className="btn-primary">
              Explorer les annonces
            </Link>
          }
        >
          Touchez le cœur sur une annonce pour la retrouver ici.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((it) => (
            <ListingCard key={it.id} listing={it} />
          ))}
        </div>
      )}
    </div>
  );
}
