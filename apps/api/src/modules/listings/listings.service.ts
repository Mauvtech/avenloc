import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { ListingStatus, BookingStatus, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { FeaturesService } from '@/modules/features/features.service';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { CreateListingDto } from './dto/create-listing.dto';
import type { UpdateListingDto } from './dto/update-listing.dto';
import type { CreateAvailabilityDto } from './dto/availability.dto';
import type { ListingResponseDto } from './dto/listing-response.dto';
import type { Listing, ListingAvailability, ListingPhoto } from '@prisma/client';

type ListingWithRelations = Listing & {
  photos: ListingPhoto[];
  availabilities?: ListingAvailability[];
  host?:
    | {
        stripeAccountStatus: string | null;
        id?: string;
        firstName?: string;
        lastName?: string;
        avatarUrl?: string | null;
        bio?: string | null;
        createdAt?: Date;
      }
    | null;
};

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly features: FeaturesService,
  ) {}

  async create(dto: CreateListingDto, currentUser: AuthenticatedUser): Promise<ListingResponseDto> {
    if (!currentUser.roles.includes('HOST')) {
      throw new ForbiddenException('Vous devez être hôte pour créer une annonce');
    }

    const listing = await this.prisma.listing.create({
      data: {
        hostId: currentUser.id,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        city: dto.city,
        postalCode: dto.postalCode,
        country: dto.country ?? 'FR',
        latitude: dto.latitude,
        longitude: dto.longitude,
        maxGuests: dto.maxGuests,
        pricingUnit: dto.pricingUnit,
        basePrice: dto.basePrice,
        cleaningFee: dto.cleaningFee,
        serviceFeeRateOverride: dto.serviceFeeRateOverride,
        cancellationPolicy: dto.cancellationPolicy,
        instantBookEnabled: dto.instantBookEnabled ?? false,
        amenities: dto.amenities ?? [],
        specificAttributes: dto.specificAttributes as Prisma.InputJsonValue ?? Prisma.JsonNull,
      },
      include: { photos: true },
    });

    return this.toResponseDto(listing);
  }

  async findOne(id: string, currentUser?: AuthenticatedUser): Promise<ListingResponseDto> {
    const listing = await this.prisma.listing.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { position: 'asc' } },
        availabilities: true,
        host: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            bio: true,
            createdAt: true,
            stripeAccountStatus: true,
          },
        },
      },
    });

    if (!listing) throw new NotFoundException('Annonce introuvable');

    if (listing.status !== ListingStatus.PUBLISHED) {
      if (!currentUser || listing.hostId !== currentUser.id) {
        throw new NotFoundException('Annonce introuvable');
      }
    }

    return this.toResponseDto(listing);
  }

  async findMyListings(currentUser: AuthenticatedUser): Promise<ListingResponseDto[]> {
    const listings = await this.prisma.listing.findMany({
      where: { hostId: currentUser.id },
      include: {
        photos: { orderBy: { position: 'asc' } },
        host: { select: { stripeAccountStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.toResponseDto(l));
  }

  async update(
    id: string,
    dto: UpdateListingDto,
    currentUser: AuthenticatedUser,
  ): Promise<ListingResponseDto> {
    const listing = await this.findAndVerifyOwnership(id, currentUser);

    // Interdire modification si réservation CONFIRMED active
    const activeBooking = await this.prisma.booking.findFirst({
      where: { listingId: id, status: BookingStatus.CONFIRMED },
    });
    if (activeBooking) {
      throw new ConflictException(
        'Impossible de modifier une annonce avec des réservations confirmées actives',
      );
    }

    const updated = await this.prisma.listing.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.addressLine1 !== undefined && { addressLine1: dto.addressLine1 }),
        ...(dto.addressLine2 !== undefined && { addressLine2: dto.addressLine2 }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode }),
        ...(dto.country !== undefined && { country: dto.country }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.maxGuests !== undefined && { maxGuests: dto.maxGuests }),
        ...(dto.pricingUnit !== undefined && { pricingUnit: dto.pricingUnit }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.cleaningFee !== undefined && { cleaningFee: dto.cleaningFee }),
        ...(dto.serviceFeeRateOverride !== undefined && {
          serviceFeeRateOverride: dto.serviceFeeRateOverride,
        }),
        ...(dto.cancellationPolicy !== undefined && { cancellationPolicy: dto.cancellationPolicy }),
        ...(dto.instantBookEnabled !== undefined && { instantBookEnabled: dto.instantBookEnabled }),
        ...(dto.amenities !== undefined && { amenities: dto.amenities }),
        ...(dto.specificAttributes !== undefined && { specificAttributes: dto.specificAttributes as Prisma.InputJsonValue }),
      },
      include: { photos: { orderBy: { position: 'asc' } } },
    });

    return this.toResponseDto(updated);
  }

  async archive(id: string, currentUser: AuthenticatedUser): Promise<void> {
    await this.findAndVerifyOwnership(id, currentUser);
    await this.prisma.listing.update({
      where: { id },
      data: { status: ListingStatus.ARCHIVED },
    });
  }

  async updateStatus(
    id: string,
    status: 'DRAFT' | 'PUBLISHED',
    currentUser: AuthenticatedUser,
  ): Promise<ListingResponseDto> {
    const listing = await this.findAndVerifyOwnership(id, currentUser);

    if (listing.status === ListingStatus.ARCHIVED) {
      throw new BadRequestException('Une annonce archivée ne peut pas changer de statut');
    }

    const updated = await this.prisma.listing.update({
      where: { id },
      data: { status },
      include: { photos: { orderBy: { position: 'asc' } } },
    });

    return this.toResponseDto(updated);
  }

  async uploadPhoto(
    id: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    currentUser: AuthenticatedUser,
  ): Promise<ListingPhoto> {
    await this.findAndVerifyOwnership(id, currentUser);

    if (!mimeType.startsWith('image/')) {
      throw new BadRequestException('Le fichier doit être une image');
    }

    const ext = extname(originalName).toLowerCase() || '.jpg';
    const key = `listings/${id}/photos/${randomUUID()}${ext}`;
    const url = await this.storage.upload(key, buffer, mimeType);

    const count = await this.prisma.listingPhoto.count({ where: { listingId: id } });

    return this.prisma.listingPhoto.create({
      data: { listingId: id, url, position: count },
    });
  }

  async reorderPhotos(
    listingId: string,
    order: string[],
    currentUser: AuthenticatedUser,
  ): Promise<ListingPhoto[]> {
    await this.findAndVerifyOwnership(listingId, currentUser);

    const photos = await this.prisma.listingPhoto.findMany({ where: { listingId } });
    const ids = new Set(photos.map((p) => p.id));
    if (order.length !== photos.length || order.some((id) => !ids.has(id))) {
      throw new BadRequestException('La liste des photos ne correspond pas à l’annonce');
    }

    await this.prisma.$transaction(
      order.map((id, position) =>
        this.prisma.listingPhoto.update({ where: { id }, data: { position } }),
      ),
    );

    return this.prisma.listingPhoto.findMany({
      where: { listingId },
      orderBy: { position: 'asc' },
    });
  }

  async deletePhoto(
    listingId: string,
    photoId: string,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    await this.findAndVerifyOwnership(listingId, currentUser);

    const photo = await this.prisma.listingPhoto.findUnique({ where: { id: photoId } });
    if (!photo || photo.listingId !== listingId) {
      throw new NotFoundException('Photo introuvable');
    }

    await this.storage.delete(photo.url);
    await this.prisma.listingPhoto.delete({ where: { id: photoId } });
  }

  async getAvailabilities(listingId: string): Promise<ListingAvailability[]> {
    return this.prisma.listingAvailability.findMany({
      where: { listingId },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Plages de dates indisponibles pour un locataire : jours bloqués par l'hôte
   * + réservations actives. `end` exclusif. Format ISO (YYYY-MM-DD).
   */
  async getUnavailableRanges(
    listingId: string,
  ): Promise<{ start: string; end: string }[]> {
    const [blocks, bookings] = await Promise.all([
      this.prisma.listingAvailability.findMany({
        where: { listingId, isAvailable: false },
        select: { startDate: true, endDate: true },
      }),
      this.prisma.booking.findMany({
        where: { listingId, status: { in: ['PENDING', 'CONFIRMED'] } },
        select: { startDate: true, endDate: true },
      }),
    ]);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return [...blocks, ...bookings]
      .map((r) => ({ start: iso(r.startDate), end: iso(r.endDate) }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  async addAvailability(
    listingId: string,
    dto: CreateAvailabilityDto,
    currentUser: AuthenticatedUser,
  ): Promise<ListingAvailability> {
    await this.findAndVerifyOwnership(listingId, currentUser);

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (end <= start) {
      throw new BadRequestException('endDate doit être postérieure à startDate');
    }

    const isAvailable = dto.isAvailable ?? true;

    // On ne compare qu'aux plages de MÊME nature : un jour bloqué peut tout à fait
    // se situer à l'intérieur d'une fenêtre "disponible" (c'est le but).
    const overlapping = await this.prisma.listingAvailability.findFirst({
      where: {
        listingId,
        isAvailable,
        startDate: { lt: end },
        endDate: { gt: start },
      },
    });

    if (overlapping) {
      // Plage déjà couverte → idempotent (double-clic, état obsolète côté client).
      if (overlapping.startDate <= start && overlapping.endDate >= end) {
        return overlapping;
      }
      throw new ConflictException('Cette plage chevauche une disponibilité existante');
    }

    return this.prisma.listingAvailability.create({
      data: { listingId, startDate: start, endDate: end, isAvailable },
    });
  }

  async deleteAvailability(
    listingId: string,
    availId: string,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    await this.findAndVerifyOwnership(listingId, currentUser);

    const avail = await this.prisma.listingAvailability.findUnique({ where: { id: availId } });
    if (!avail || avail.listingId !== listingId) {
      throw new NotFoundException('Disponibilité introuvable');
    }

    await this.prisma.listingAvailability.delete({ where: { id: availId } });
  }

  private async findAndVerifyOwnership(
    listingId: string,
    currentUser: AuthenticatedUser,
  ): Promise<Listing> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Annonce introuvable');
    if (listing.hostId !== currentUser.id) {
      throw new ForbiddenException("Vous n'êtes pas propriétaire de cette annonce");
    }
    return listing;
  }

  private toResponseDto(listing: ListingWithRelations): ListingResponseDto {
    return {
      id: listing.id,
      hostId: listing.hostId,
      type: listing.type,
      status: listing.status,
      title: listing.title,
      description: listing.description,
      addressLine1: listing.addressLine1,
      addressLine2: listing.addressLine2,
      city: listing.city,
      postalCode: listing.postalCode,
      country: listing.country,
      latitude: listing.latitude,
      longitude: listing.longitude,
      maxGuests: listing.maxGuests,
      pricingUnit: listing.pricingUnit,
      basePrice: listing.basePrice.toString(),
      cleaningFee: listing.cleaningFee?.toString() ?? null,
      serviceFeeRateOverride: listing.serviceFeeRateOverride?.toString() ?? null,
      cancellationPolicy: listing.cancellationPolicy,
      instantBookEnabled: listing.instantBookEnabled,
      amenities: listing.amenities,
      specificAttributes: listing.specificAttributes,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      photos: listing.photos,
      availabilities: listing.availabilities,
      // L'hôte a-t-il finalisé ses versements ? (ou flag démo « simulatePayments »)
      hostPaymentsReady:
        this.features.isOn('simulatePayments') ||
        listing.host?.stripeAccountStatus === 'active',
      host: listing.host?.id
        ? {
            id: listing.host.id,
            firstName: listing.host.firstName ?? '',
            lastName: listing.host.lastName ?? '',
            avatarUrl: listing.host.avatarUrl ?? null,
            bio: listing.host.bio ?? null,
            createdAt: listing.host.createdAt ?? null,
          }
        : null,
    };
  }
}
