'use client';

import { useEffect, useState } from 'react';
import { isWishlisted, onWishlistChange, toggleWishlist } from '@/lib/wishlist';

export default function WishlistButton({
  listingId,
  className = '',
}: {
  listingId: string;
  className?: string;
}) {
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(isWishlisted(listingId));
    return onWishlistChange(() => setOn(isWishlisted(listingId)));
  }, [listingId]);

  return (
    <button
      type="button"
      aria-label={on ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(listingId);
      }}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-ink shadow-xs backdrop-blur transition-transform hover:scale-110 ${className}`}
    >
      <svg viewBox="0 0 24 24" width="17" height="17" fill={on ? 'currentColor' : 'none'} className={on ? 'text-danger' : 'text-ink'}>
        <path
          d="M12 20.5S3.5 14.7 3.5 9.2C3.5 6.6 5.6 4.5 8.2 4.5c1.7 0 3.2.9 3.8 2.3.6-1.4 2.1-2.3 3.8-2.3 2.6 0 4.7 2.1 4.7 4.7 0 5.5-8.5 11.3-8.5 11.3Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
