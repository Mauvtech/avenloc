export default function ListingRating({ rating, count, showCount = false }: {
  rating: number | null | undefined;
  count?: number;
  showCount?: boolean;
}) {
  const hasReviews = rating != null && count !== 0;
  return (
    <span className="flex-none text-[13px] text-ink" title={hasReviews ? undefined : 'Aucun avis'}>
      <span aria-label={hasReviews ? `${rating.toFixed(1)} sur 5` : '0 sur 5, aucun avis'}>
        ★ {(hasReviews ? rating : 0).toFixed(1).replace('.', ',')}
      </span>
      {!hasReviews && showCount && <span className="ml-1 text-xs text-muted">(Aucun avis)</span>}
      {hasReviews && showCount && count != null && <span className="ml-1 text-muted">({count} avis)</span>}
    </span>
  );
}
