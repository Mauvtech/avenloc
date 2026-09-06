import Link from 'next/link';
import CategoryIcon from '@/components/category-icon';
import WishlistButton from '@/components/wishlist-button';
import { typeLabel, UNIT_LABEL_SHORT } from '@/lib/listing';
import type { SearchResultItem } from '@/lib/types';

export default function ListingCard({ listing }: { listing: SearchResultItem }) {
  const unit = UNIT_LABEL_SHORT[listing.pricingUnit] ?? '';
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block overflow-hidden rounded-lg border border-line bg-surface shadow-card transition-all hover:-translate-y-0.5 hover:shadow-raised"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-canvas">
        {listing.coverPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.coverPhotoUrl}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <CategoryIcon type={listing.type} size={34} className="text-line" />
          </div>
        )}
        <WishlistButton listingId={listing.id} className="absolute right-2.5 top-2.5" />
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-bold text-ink backdrop-blur">
          <CategoryIcon type={listing.type} size={12} />
          {typeLabel(listing.type)}
        </span>
      </div>

      <div className="space-y-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-[15px] font-bold">{listing.title}</h3>
          {listing.rating !== null && (
            <span className="flex-none text-xs font-semibold text-ink">
              ★ {listing.rating.toFixed(1)}
              <span className="font-normal text-muted"> ({listing.reviewCount})</span>
            </span>
          )}
        </div>
        <p className="text-xs text-muted">
          {listing.city}
          {listing.distanceKm > 0 && ` · ${listing.distanceKm.toFixed(1)} km`}
        </p>
        <p className="pt-1 text-[15px]">
          <span className="font-extrabold">{listing.basePrice} €</span>
          <span className="text-sm text-muted"> / {unit}</span>
        </p>
      </div>
    </Link>
  );
}
