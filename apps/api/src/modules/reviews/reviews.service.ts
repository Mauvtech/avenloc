import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { BookingStatus, ReviewTarget } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { CreateReviewDto } from './dto/create-review.dto';
import type { ReviewResponseDto, ListingReviewsResponseDto } from './dto/review-response.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreateReviewDto): Promise<ReviewResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
      include: { listing: { select: { id: true, hostId: true } } },
    });

    if (!booking) throw new NotFoundException('Réservation introuvable');
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new ForbiddenException(
        'Un avis ne peut être déposé que sur une réservation terminée',
      );
    }

    // Vérification que l'auteur est bien participant et que sa cible est cohérente
    if (dto.target === ReviewTarget.LISTING) {
      if (booking.tenantId !== authorId) {
        throw new ForbiddenException('Seul le locataire peut noter le local');
      }
    } else {
      if (booking.listing.hostId !== authorId) {
        throw new ForbiddenException('Seul l\'hôte peut noter le locataire');
      }
    }

    try {
      const review = await this.prisma.review.create({
        data: {
          bookingId: dto.bookingId,
          authorId,
          target: dto.target,
          rating: dto.rating,
          comment: dto.comment ?? null,
          isPublic: dto.isPublic ?? true,
          listingId: dto.target === ReviewTarget.LISTING ? booking.listing.id : null,
          tenantSubjectId: dto.target === ReviewTarget.TENANT ? booking.tenantId : null,
        },
        include: {
          author: { select: { firstName: true } },
        },
      });

      return {
        id: review.id,
        bookingId: review.bookingId,
        authorId: review.authorId,
        authorFirstName: review.author.firstName,
        target: review.target,
        rating: review.rating,
        comment: review.comment,
        isPublic: review.isPublic,
        listingId: review.listingId,
        tenantSubjectId: review.tenantSubjectId,
        createdAt: review.createdAt,
      };
    } catch (err: unknown) {
      // Contrainte unique [bookingId, authorId, target] → doublon
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Vous avez déjà déposé un avis pour cette réservation');
      }
      throw err;
    }
  }

  async findByListing(
    listingId: string,
    page: number,
    limit: number,
  ): Promise<ListingReviewsResponseDto> {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { listingId, target: ReviewTarget.LISTING, isPublic: true },
        include: { author: { select: { firstName: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({
        where: { listingId, target: ReviewTarget.LISTING, isPublic: true },
      }),
    ]);

    const aggregate = await this.prisma.review.aggregate({
      where: { listingId, target: ReviewTarget.LISTING, isPublic: true },
      _avg: { rating: true },
    });

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        authorId: r.authorId,
        authorFirstName: r.author.firstName,
        target: r.target,
        rating: r.rating,
        comment: r.comment,
        isPublic: r.isPublic,
        listingId: r.listingId,
        tenantSubjectId: r.tenantSubjectId,
        createdAt: r.createdAt,
      })),
      averageRating: aggregate._avg.rating,
      total,
    };
  }

  async findByUser(
    userId: string,
    page: number,
    limit: number,
  ): Promise<ReviewResponseDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: { tenantSubjectId: userId, target: ReviewTarget.TENANT, isPublic: true },
      include: { author: { select: { firstName: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return reviews.map((r) => ({
      id: r.id,
      bookingId: r.bookingId,
      authorId: r.authorId,
      authorFirstName: r.author.firstName,
      target: r.target,
      rating: r.rating,
      comment: r.comment,
      isPublic: r.isPublic,
      listingId: r.listingId,
      tenantSubjectId: r.tenantSubjectId,
      createdAt: r.createdAt,
    }));
  }

  async findPending(userId: string): Promise<{ bookingId: string; possibleTargets: ReviewTarget[] }[]> {
    // Réservations COMPLETED où l'utilisateur n'a pas encore déposé tous les avis possibles
    const completedBookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.COMPLETED,
        OR: [{ tenantId: userId }, { listing: { hostId: userId } }],
      },
      include: {
        reviews: { where: { authorId: userId }, select: { target: true } },
        listing: { select: { hostId: true } },
      },
    });

    const result: { bookingId: string; possibleTargets: ReviewTarget[] }[] = [];

    for (const booking of completedBookings) {
      const existingTargets = booking.reviews.map((r) => r.target);
      const possibleTargets: ReviewTarget[] = [];

      if (booking.tenantId === userId && !existingTargets.includes(ReviewTarget.LISTING)) {
        possibleTargets.push(ReviewTarget.LISTING);
      }
      if (booking.listing.hostId === userId && !existingTargets.includes(ReviewTarget.TENANT)) {
        possibleTargets.push(ReviewTarget.TENANT);
      }

      if (possibleTargets.length > 0) {
        result.push({ bookingId: booking.id, possibleTargets });
      }
    }

    return result;
  }
}
