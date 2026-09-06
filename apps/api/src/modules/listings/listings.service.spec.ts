import { Test, type TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ListingsService } from './listings.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { FeaturesService } from '@/modules/features/features.service';
import { ListingStatus, ListingType, PricingUnit, CancellationPolicy } from '@prisma/client';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { Listing } from '@prisma/client';

const hostUser: AuthenticatedUser = { id: 'host-1', email: 'host@test.com', roles: ['HOST'] };
const tenantUser: AuthenticatedUser = { id: 'tenant-1', email: 'tenant@test.com', roles: ['TENANT'] };
const otherHost: AuthenticatedUser = { id: 'host-2', email: 'host2@test.com', roles: ['HOST'] };

const mockListing: Listing & { photos: []; availabilities: [] } = {
  id: 'listing-1',
  hostId: 'host-1',
  type: ListingType.APARTMENT,
  status: ListingStatus.DRAFT,
  title: 'Bel appartement Paris',
  description: 'Description longue de plus de 20 caractères',
  addressLine1: '10 Rue de la Paix',
  addressLine2: null,
  city: 'Paris',
  postalCode: '75001',
  country: 'FR',
  latitude: 48.8566,
  longitude: 2.3522,
  maxGuests: 4,
  pricingUnit: PricingUnit.NIGHT,
  basePrice: 100 as unknown as Listing['basePrice'],
  cleaningFee: null,
  serviceFeeRateOverride: null,
  cancellationPolicy: CancellationPolicy.MODERATE,
  instantBookEnabled: false,
  amenities: ['wifi'],
  specificAttributes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  photos: [],
  availabilities: [],
};

function buildMockPrisma() {
  return {
    listing: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    booking: { findFirst: jest.fn() },
    listingPhoto: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    listingAvailability: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('ListingsService', () => {
  let service: ListingsService;
  let prisma: ReturnType<typeof buildMockPrisma>;

  beforeEach(async () => {
    prisma = buildMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: StorageService,
          useValue: { upload: jest.fn().mockResolvedValue('https://s3.test/photo.jpg'), delete: jest.fn() },
        },
        {
          provide: FeaturesService,
          useValue: { isOn: jest.fn().mockReturnValue(false), all: jest.fn().mockReturnValue({}), set: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(ListingsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('crée une annonce en DRAFT pour un hôte', async () => {
      prisma.listing.create.mockResolvedValue(mockListing);

      const result = await service.create(
        {
          type: ListingType.APARTMENT,
          title: 'Bel appartement',
          description: 'Description de plus de vingt caractères ici',
          addressLine1: '10 Rue de la Paix',
          city: 'Paris',
          postalCode: '75001',
          latitude: 48.8566,
          longitude: 2.3522,
          pricingUnit: PricingUnit.NIGHT,
          basePrice: 100,
          cancellationPolicy: CancellationPolicy.MODERATE,
          instantBookEnabled: false,
          amenities: [],
        },
        hostUser,
      );

      expect(prisma.listing.create).toHaveBeenCalled();
      expect(result.status).toBe(ListingStatus.DRAFT);
    });

    it("lance ForbiddenException si l'utilisateur n'est pas hôte", async () => {
      await expect(
        service.create(
          {
            type: ListingType.APARTMENT,
            title: 'Title',
            description: 'desc',
            addressLine1: 'addr',
            city: 'Paris',
            postalCode: '75001',
            latitude: 48,
            longitude: 2,
            pricingUnit: PricingUnit.NIGHT,
            basePrice: 50,
            cancellationPolicy: CancellationPolicy.FLEXIBLE,
            instantBookEnabled: false,
            amenities: [],
          },
          tenantUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retourne une annonce PUBLISHED sans auth', async () => {
      prisma.listing.findUnique.mockResolvedValue({ ...mockListing, status: ListingStatus.PUBLISHED });

      const result = await service.findOne('listing-1');
      expect(result.id).toBe('listing-1');
    });

    it('retourne un DRAFT pour le host propriétaire', async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing);
      const result = await service.findOne('listing-1', hostUser);
      expect(result.status).toBe(ListingStatus.DRAFT);
    });

    it("lance NotFoundException pour un DRAFT vu par un autre utilisateur", async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing);
      await expect(service.findOne('listing-1', otherHost)).rejects.toThrow(NotFoundException);
    });

    it('lance NotFoundException si introuvable', async () => {
      prisma.listing.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('met à jour si owner et pas de réservation active', async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing);
      prisma.booking.findFirst.mockResolvedValue(null);
      prisma.listing.update.mockResolvedValue({ ...mockListing, title: 'Nouveau titre', photos: [] });

      const result = await service.update('listing-1', { title: 'Nouveau titre' }, hostUser);
      expect(result.title).toBe('Nouveau titre');
    });

    it('lance ForbiddenException si pas owner', async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing);
      await expect(service.update('listing-1', { title: 'X' }, otherHost)).rejects.toThrow(ForbiddenException);
    });

    it('lance ConflictException si réservation CONFIRMED active', async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing);
      prisma.booking.findFirst.mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED' });
      await expect(service.update('listing-1', { title: 'X' }, hostUser)).rejects.toThrow(ConflictException);
    });
  });

  // ── updateStatus ──────────────────────────────────────────────────────────

  describe('updateStatus', () => {
    it('publie une annonce DRAFT → PUBLISHED', async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing);
      prisma.listing.update.mockResolvedValue({
        ...mockListing,
        status: ListingStatus.PUBLISHED,
        photos: [],
      });

      const result = await service.updateStatus('listing-1', ListingStatus.PUBLISHED, hostUser);
      expect(result.status).toBe(ListingStatus.PUBLISHED);
    });

    it('lance BadRequestException si annonce ARCHIVED', async () => {
      prisma.listing.findUnique.mockResolvedValue({ ...mockListing, status: ListingStatus.ARCHIVED });
      await expect(
        service.updateStatus('listing-1', ListingStatus.PUBLISHED, hostUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
