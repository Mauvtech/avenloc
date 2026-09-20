import Link from 'next/link';
import VerificationBadge from '@/components/verification-badge';
import WishlistButton from '@/components/wishlist-button';
import { eurRound } from '@/lib/format';
import { typeLabel, UNIT_LABEL_SHORT } from '@/lib/listing';
import type { SearchResultItem } from '@/lib/types';

export default function ListingCard({ listing }: { listing: SearchResultItem }) {
  const unit = UNIT_LABEL_SHORT[listing.pricingUnit] ?? '';
  return (
    <Link href={`/listings/${listing.id}`} className="group block">
      <div className="relative aspect-[4/3] overflow-hidden rounded bg-canvas">
        {listing.coverPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.coverPhotoUrl}
            alt={listing.title}
            className="h-full w-full object-cover"
          />
        ) : null}
        <WishlistButton listingId={listing.id} className="absolute right-2.5 top-2.5" />
      </div>

      <div className="mt-2.5 flex items-start justify-between gap-2">
        <h3 className="line-clamp-1 text-sm font-semibold">{listing.title}</h3>
        {listing.rating !== null && <span className="flex-none text-[13px] text-ink">★ {listing.rating.toFixed(1)}</span>}
      </div>
      <p className="mt-0.5 text-[13px] text-muted">
        {typeLabel(listing.type)}
        {listing.maxGuests != null && ` · ${listing.maxGuests} pers.`}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <p className="text-sm text-ink">
          <span className="font-semibold">{eurRound(listing.basePrice)}</span>
          <span className="text-muted"> / {unit}</span>
        </p>
        <VerificationBadge verifiedAt={listing.verifiedAt} />
      </div>
    </Link>
  );
}
