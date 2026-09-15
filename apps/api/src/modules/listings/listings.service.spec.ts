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
import { AuthService } from '@/modules/auth/auth.service';
import { ListingStatus, ListingType, PricingUnit, CancellationPolicy } from '@prisma/client';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { Listing } from '@prisma/client';

const hostUser: AuthenticatedUser = { id: 'host-1', email: 'host@test.com', roles: ['HOST'] };
const tenantUser: AuthenticatedUser = { id: 'tenant-1', email: 'tenant@test.com', roles: ['TENANT'] };
const otherHost: AuthenticatedUser = { id: 'host-2', email: 'host2@test.com', roles: ['HOST'] };

const mockListing: Listing & { photos: []; availabilities: [] } = {
  id: 'listing-1',
  hostId: 'host-1',
  type: ListingType.MEETING_ROOM,
  status: ListingStatus.DRAFT,
  title: 'Bel appartement Paris',
  description: 'Description longue de plus de 20 caractÃ¨res',
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
  depositAmount: null,
  serviceFeeRateOverride: null,
  cancellationPolicy: CancellationPolicy.MODERATE,
  instantBookEnabled: false,
  createdByCommercial: false,
  accessMethod: 'CODE',
  accessCode: null,
  wifiName: null,
  wifiPassword: null,
  contactPhone: null,
  rcProRequired: false,
  houseRules: null,
  faq: null,
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
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    booking: { findFirst: jest.fn(), findMany: jest.fn() },
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
    listingAvailabilityRule: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };
}

describe('ListingsService', () => {
  let service: ListingsService;
  let prisma: ReturnType<typeof buildMockPrisma>;
  let authService: { inviteHost: jest.Mock };

  beforeEach(async () => {
    prisma = buildMockPrisma();
    authService = { inviteHost: jest.fn().mockResolvedValue({}) };
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
        { provide: AuthService, useValue: authService },
      ],
    }).compile();

    service = module.get(ListingsService);
  });

  afterEach(() => jest.clearAllMocks());

  // â”€â”€ create â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('create', () => {
    it('crÃ©e une annonce en DRAFT pour un hÃ´te', async () => {
      prisma.listing.create.mockResolvedValue(mockListing);

      const result = await service.create(
        {
          type: ListingType.MEETING_ROOM,
          title: 'Bel appartement',
          description: 'Description de plus de vingt caractÃ¨res ici',
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

    it("lance ForbiddenException si l'utilisateur n'est pas hÃ´te", async () => {
      await expect(
        service.create(
          {
            type: ListingType.MEETING_ROOM,
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

  // â”€â”€ findOne â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('findOne', () => {
    it('retourne une annonce PUBLISHED sans auth', async () => {
      prisma.listing.findUnique.mockResolvedValue({ ...mockListing, status: ListingStatus.PUBLISHED });

      const result = await service.findOne('listing-1');
      expect(result.id).toBe('listing-1');
    });

    it('retourne un DRAFT pour le host propriÃ©taire', async () => {
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

  // â”€â”€ update â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('update', () => {
    it('met Ã  jour si owner et pas de rÃ©servation active', async () => {
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

    it('lance ConflictException si champ structurel (prix) modifiÃ© avec rÃ©servation CONFIRMED active', async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing);
      prisma.booking.findFirst.mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED' });
      await expect(service.update('listing-1', { basePrice: 99 }, hostUser)).rejects.toThrow(ConflictException);
    });

    it('autorise la modification de champs informatifs (accÃ¨s, titre) malgrÃ© une rÃ©servation CONFIRMED active', async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing);
      prisma.booking.findFirst.mockResolvedValue({ id: 'booking-1', status: 'CONFIRMED' });
      prisma.listing.update.mockResolvedValue({ ...mockListing, title: 'X', accessCode: '4812', photos: [] });

      const result = await service.update('listing-1', { title: 'X', accessCode: '4812' }, hostUser);
      expect(result.title).toBe('X');
      expect(prisma.booking.findFirst).not.toHaveBeenCalled();
    });
  });

  // â”€â”€ updateStatus â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('updateStatus', () => {
    it('publie une annonce DRAFT â†’ PUBLISHED', async () => {
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

  // â”€â”€ createForHost â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('createForHost', () => {
    const commercialDto = {
      type: ListingType.MEETING_ROOM,
      title: 'Salle crÃ©Ã©e par un commercial',
      description: 'Description de plus de vingt caractÃ¨res ici',
      addressLine1: '1 avenue des Champs',
      city: 'Paris',
      postalCode: '75008',
      latitude: 48.87,
      longitude: 2.3,
      pricingUnit: PricingUnit.HOUR,
      basePrice: 40,
      cancellationPolicy: CancellationPolicy.MODERATE,
      instantBookEnabled: false,
      amenities: [],
      hostEmail: 'nouvel.hote@test.com',
      hostName: 'Jean Dupont',
      hostPhone: '0600000000',
    };

    it("crÃ©e un compte hÃ´te sans mot de passe et gÃ©nÃ¨re un lien d'activation si l'email est inconnu", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'new-host-id',
        roles: ['HOST', 'TENANT'],
      });
      prisma.listing.create.mockResolvedValue({ ...mockListing, hostId: 'new-host-id', createdByCommercial: true });
      authService.inviteHost.mockResolvedValue({ devActivationUrl: 'http://localhost:3000/auth/reset?token=abc' });

      const result = await service.createForHost(commercialDto, hostUser);

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'nouvel.hote@test.com',
            firstName: 'Jean',
            lastName: 'Dupont',
            roles: ['HOST', 'TENANT'],
          }),
        }),
      );
      expect(prisma.listing.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ hostId: 'new-host-id', createdByCommercial: true }),
        }),
      );
      expect(result.isNewHost).toBe(true);
      expect(result.devActivationUrl).toBe('http://localhost:3000/auth/reset?token=abc');
    });

    it("crÃ©e les crÃ©neaux horaires fournis dans la mÃªme opÃ©ration (pas d'appel sÃ©parÃ© gated sur la propriÃ©tÃ©)", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id', roles: ['HOST', 'TENANT'] });
      prisma.listing.create.mockResolvedValue({ ...mockListing, hostId: 'existing-id', pricingUnit: PricingUnit.HOUR, createdByCommercial: true });

      await service.createForHost(
        { ...commercialDto, availabilityRules: [{ dayOfWeek: 1, startTime: '08:00', endTime: '19:00' }] },
        hostUser,
      );

      expect(prisma.listingAvailabilityRule.createMany).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '19:00',
            minDurationMinutes: 60,
            minLeadTimeMinutes: 0,
          }),
        ],
      });
    });

    it("rÃ©utilise le compte existant et lui ajoute le rÃ´le HOST s'il ne l'a pas dÃ©jÃ ", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id', roles: ['TENANT'] });
      prisma.user.update.mockResolvedValue({ id: 'existing-id', roles: ['TENANT', 'HOST'] });
      prisma.listing.create.mockResolvedValue({ ...mockListing, hostId: 'existing-id', createdByCommercial: true });

      const result = await service.createForHost(commercialDto, hostUser);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'existing-id' },
        data: { roles: ['TENANT', 'HOST'] },
      });
      expect(result.isNewHost).toBe(false);
      expect(result.devActivationUrl).toBeNull();
      expect(authService.inviteHost).not.toHaveBeenCalled();
    });

    it('ne touche pas aux rÃ´les si le compte existant est dÃ©jÃ  hÃ´te', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-host', roles: ['HOST', 'TENANT'] });
      prisma.listing.create.mockResolvedValue({ ...mockListing, hostId: 'existing-host', createdByCommercial: true });

      await service.createForHost(commercialDto, hostUser);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  // â”€â”€ getSlots â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('getSlots', () => {
    const hourListing = { ...mockListing, pricingUnit: PricingUnit.HOUR };

    it('lance BadRequestException si la date est manquante', async () => {
      await expect(service.getSlots('listing-1', '')).rejects.toThrow(BadRequestException);
    });

    it("lance NotFoundException si l'annonce est introuvable", async () => {
      prisma.listing.findUnique.mockResolvedValue(null);
      await expect(service.getSlots('listing-1', '2026-09-15')).rejects.toThrow(NotFoundException);
    });

    it("lance BadRequestException si l'annonce n'est pas facturÃ©e Ã  l'heure", async () => {
      prisma.listing.findUnique.mockResolvedValue(mockListing); // pricingUnit NIGHT
      await expect(service.getSlots('listing-1', '2026-09-15')).rejects.toThrow(BadRequestException);
    });

    it('retourne un tableau vide si aucune rÃ¨gle ne couvre ce jour', async () => {
      prisma.listing.findUnique.mockResolvedValue(hourListing);
      prisma.listingAvailabilityRule.findMany.mockResolvedValue([]);

      const result = await service.getSlots('listing-1', '2026-09-15');
      expect(result).toEqual([]);
    });

    it('dÃ©coupe une rÃ¨gle en crÃ©neaux horaires et retire ceux dÃ©jÃ  rÃ©servÃ©s', async () => {
      prisma.listing.findUnique.mockResolvedValue(hourListing);
      prisma.listingAvailabilityRule.findMany.mockResolvedValue([
        {
          id: 'r1',
          listingId: 'listing-1',
          dayOfWeek: 2,
          startTime: '08:00',
          endTime: '11:00',
          minDurationMinutes: 60,
          minLeadTimeMinutes: 0,
        },
      ]);
      prisma.listingAvailability.findMany.mockResolvedValue([]);
      prisma.booking.findMany.mockResolvedValue([
        { startDate: new Date('2026-09-15T09:00:00'), endDate: new Date('2026-09-15T10:00:00') },
      ]);

      const result = await service.getSlots('listing-1', '2026-09-15');
      expect(result.map((s) => s.start)).toEqual([
        new Date('2026-09-15T08:00:00').toISOString(),
        new Date('2026-09-15T10:00:00').toISOString(),
      ]);
    });

    it('retire les crÃ©neaux chevauchant un blocage hÃ´te', async () => {
      prisma.listing.findUnique.mockResolvedValue(hourListing);
      prisma.listingAvailabilityRule.findMany.mockResolvedValue([
        {
          id: 'r1',
          listingId: 'listing-1',
          dayOfWeek: 2,
          startTime: '08:00',
          endTime: '10:00',
          minDurationMinutes: 60,
          minLeadTimeMinutes: 0,
        },
      ]);
      prisma.listingAvailability.findMany.mockResolvedValue([
        { startDate: new Date('2026-09-15T08:00:00'), endDate: new Date('2026-09-15T09:00:00') },
      ]);
      prisma.booking.findMany.mockResolvedValue([]);

      const result = await service.getSlots('listing-1', '2026-09-15');
      expect(result.map((s) => s.start)).toEqual([new Date('2026-09-15T09:00:00').toISOString()]);
    });
  });

  // â”€â”€ getSlotsForManagement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  describe('getSlotsForManagement', () => {
    const hourListing = { ...mockListing, pricingUnit: PricingUnit.HOUR };

    it("lance ForbiddenException si l'appelant n'est pas propriÃ©taire", async () => {
      prisma.listing.findUnique.mockResolvedValue(hourListing);
      await expect(
        service.getSlotsForManagement('listing-1', '2026-09-15', otherHost),
      ).rejects.toThrow(ForbiddenException);
    });

    it('Ã©tiquette chaque crÃ©neau du jour selon son statut (disponible/rÃ©servÃ©/bloquÃ©)', async () => {
      prisma.listing.findUnique.mockResolvedValue(hourListing);
      prisma.listingAvailabilityRule.findMany.mockResolvedValue([
        {
          id: 'r1',
          listingId: 'listing-1',
          dayOfWeek: 2,
          startTime: '08:00',
          endTime: '11:00',
          minDurationMinutes: 60,
          minLeadTimeMinutes: 0,
        },
      ]);
      prisma.listingAvailability.findMany.mockResolvedValue([
        { id: 'avail-1', startDate: new Date('2026-09-15T10:00:00'), endDate: new Date('2026-09-15T11:00:00') },
      ]);
      prisma.booking.findMany.mockResolvedValue([
        { startDate: new Date('2026-09-15T09:00:00'), endDate: new Date('2026-09-15T10:00:00') },
      ]);

      const result = await service.getSlotsForManagement('listing-1', '2026-09-15', hostUser);

      expect(result.map((s) => s.status)).toEqual(['available', 'booked', 'blocked']);
      expect(result[2].availabilityId).toBe('avail-1');
    });
  });
});
