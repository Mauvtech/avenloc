import type { ReviewTarget } from '@prisma/client';

export class ReviewResponseDto {
  id: string = '';
  bookingId: string = '';
  authorId: string = '';
  authorFirstName: string = '';
  target: ReviewTarget = 'LISTING';
  rating: number = 5;
  comment: string | null = null;
  isPublic: boolean = true;
  listingId: string | null = null;
  tenantSubjectId: string | null = null;
  createdAt: Date = new Date();
}

export class ListingReviewsResponseDto {
  reviews: ReviewResponseDto[] = [];
  averageRating: number | null = null;
  total: number = 0;
}
