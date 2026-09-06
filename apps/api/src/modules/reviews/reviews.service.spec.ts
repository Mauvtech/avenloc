import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ReviewTarget, BookingStatus } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';

const TENANT_ID = 'tenant-uuid';
const HOST_ID = 'host-uuid';
const LISTING_ID = 'listing-uuid';
const BOOKING_ID = 'booking-uuid';

function buildMockPrisma() {
  return {
    booking: { findUnique: jest.fn(), findMany: jest.fn() },
    review: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
  };
}

const completedBooking = {
  id: BOOKING_ID,
  tenantId: TENANT_ID,
  status: BookingStatus.COMPLETED,
  listing: { id: LISTING_ID, hostId: HOST_ID },
};

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: ReturnType<typeof buildMockPrisma>;

  beforeEach(async () => {
    prisma = buildMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ReviewsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    const baseReview = {
      id: 'review-uuid',
      bookingId: BOOKING_ID,
      authorId: TENANT_ID,
      target: ReviewTarget.LISTING,
      rating: 5,
      comment: 'Excellent !',
      isPublic: true,
      listingId: LISTING_ID,
      tenantSubjectId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: { firstName: 'Alice' },
    };

    it('crée un avis tenant→listing avec succès', async () => {
      prisma.booking.findUnique.mockResolvedValue(completedBooking);
      prisma.review.create.mockResolvedValue(baseReview);

      const result = await service.create(TENANT_ID, {
        bookingId: BOOKING_ID,
        target: ReviewTarget.LISTING,
        rating: 5,
        comment: 'Excellent !',
      });

      expect(result.target).toBe(ReviewTarget.LISTING);
      expect(result.listingId).toBe(LISTING_ID);
      expect(prisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ listingId: LISTING_ID, tenantSubjectId: null }),
        }),
      );
    });

    it('crée un avis host→tenant avec succès', async () => {
      const hostReview = {
        ...baseReview,
        authorId: HOST_ID,
        target: ReviewTarget.TENANT,
        listingId: null,
        tenantSubjectId: TENANT_ID,
      };
      prisma.booking.findUnique.mockResolvedValue(completedBooking);
      prisma.review.create.mockResolvedValue(hostReview);

      const result = await service.create(HOST_ID, {
        bookingId: BOOKING_ID,
        target: ReviewTarget.TENANT,
        rating: 4,
      });

      expect(result.target).toBe(ReviewTarget.TENANT);
      expect(result.tenantSubjectId).toBe(TENANT_ID);
    });

    it("lance ForbiddenException si la réservation n'est pas COMPLETED", async () => {
      prisma.booking.findUnique.mockResolvedValue({
        ...completedBooking,
        status: BookingStatus.CONFIRMED,
      });

      await expect(
        service.create(TENANT_ID, { bookingId: BOOKING_ID, target: ReviewTarget.LISTING, rating: 5 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it("lance ForbiddenException si l'auteur ne correspond pas au rôle", async () => {
      prisma.booking.findUnique.mockResolvedValue(completedBooking);

      // L'hôte tente de noter le local (seul le tenant le peut)
      await expect(
        service.create(HOST_ID, { bookingId: BOOKING_ID, target: ReviewTarget.LISTING, rating: 3 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lance NotFoundException si la réservation est introuvable', async () => {
      prisma.booking.findUnique.mockResolvedValue(null);

      await expect(
        service.create(TENANT_ID, { bookingId: 'bad-id', target: ReviewTarget.LISTING, rating: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lance ConflictException si avis déjà déposé (P2002)', async () => {
      prisma.booking.findUnique.mockResolvedValue(completedBooking);
      const prismaError = Object.assign(new Error('Unique constraint'), { code: 'P2002' });
      prisma.review.create.mockRejectedValue(prismaError);

      await expect(
        service.create(TENANT_ID, { bookingId: BOOKING_ID, target: ReviewTarget.LISTING, rating: 5 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByListing', () => {
    it('retourne les avis avec la note moyenne', async () => {
      const mockReview = {
        id: 'r1',
        bookingId: BOOKING_ID,
        authorId: TENANT_ID,
        target: ReviewTarget.LISTING,
        rating: 4,
        comment: 'Bien',
        isPublic: true,
        listingId: LISTING_ID,
        tenantSubjectId: null,
        createdAt: new Date(),
        author: { firstName: 'Alice' },
      };
      prisma.review.findMany.mockResolvedValue([mockReview]);
      prisma.review.count.mockResolvedValue(1);
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4 } });

      const result = await service.findByListing(LISTING_ID, 1, 20);

      expect(result.averageRating).toBe(4);
      expect(result.total).toBe(1);
      expect(result.reviews).toHaveLength(1);
    });
  });
});
