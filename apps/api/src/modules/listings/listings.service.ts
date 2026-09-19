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
import type { CreateFaqItemDto, UpdateFaqItemDto } from './dto/faq.dto';
import type { ListingResponseDto } from './dto/listing-response.dto';
import {
  combineDateAndTime,
  generateDaySlots,
  markUnavailable,
  type Slot,
} from './availability-rules.util';
import type { Listing, ListingAvailability, ListingFaqItem, ListingPhoto } from '@prisma/client';

type ListingWithRelations = Listing & {
  photos: ListingPhoto[];
  availabilities?: ListingAvailability[];
  faqItems?: ListingFaqItem[];
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
        depositAmount: dto.depositAmount,
        serviceFeeRateOverride: dto.serviceFeeRateOverride,
        cancellationPolicy: dto.cancellationPolicy,
        instantBookEnabled: dto.instantBookEnabled ?? false,
        amenities: dto.amenities ?? [],
        specificAttributes: dto.specificAttributes as Prisma.InputJsonValue ?? Prisma.JsonNull,
        ...(dto.openDays !== undefined && { openDays: dto.openDays }),
        ...(dto.openStartTime !== undefined && { openStartTime: dto.openStartTime }),
        ...(dto.openEndTime !== undefined && { openEndTime: dto.openEndTime }),
        ...(dto.minDurationMinutes !== undefined && { minDurationMinutes: dto.minDurationMinutes }),
        ...(dto.minNoticeHours !== undefined && { minNoticeHours: dto.minNoticeHours }),
        accessMethod: dto.accessMethod,
        accessInstructions: dto.accessInstructions,
        activityValidationRequired: dto.activityValidationRequired ?? false,
        rcProRequired: dto.rcProRequired ?? false,
        houseRules: dto.houseRules,
        establishmentId: dto.establishmentId,
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
        faqItems: { orderBy: { position: 'asc' } },
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
      const isOwner = !!currentUser && listing.hostId === currentUser.id;
      if (!isOwner && !(currentUser && ListingsService.canModerate(currentUser))) {
        throw new NotFoundException('Annonce introuvable');
      }
    }

    return this.toResponseDto(listing);
  }

  /** Toutes les annonces, tous statuts confondus — réservé à la modération. */
  async findAllForModeration(): Promise<ListingResponseDto[]> {
    const listings = await this.prisma.listing.findMany({
      include: {
        photos: { orderBy: { position: 'asc' }, take: 1 },
        host: { select: { id: true, firstName: true, lastName: true, stripeAccountStatus: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return listings.map((l) => this.toResponseDto(l));
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
    const listing = await this.findAndVerifyAccess(id, currentUser);

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
        ...(dto.depositAmount !== undefined && { depositAmount: dto.depositAmount }),
        ...(dto.serviceFeeRateOverride !== undefined && {
          serviceFeeRateOverride: dto.serviceFeeRateOverride,
        }),
        ...(dto.cancellationPolicy !== undefined && { cancellationPolicy: dto.cancellationPolicy }),
        ...(dto.instantBookEnabled !== undefined && { instantBookEnabled: dto.instantBookEnabled }),
        ...(dto.amenities !== undefined && { amenities: dto.amenities }),
        ...(dto.specificAttributes !== undefined && { specificAttributes: dto.specificAttributes as Prisma.InputJsonValue }),
        ...(dto.openDays !== undefined && { openDays: dto.openDays }),
        ...(dto.openStartTime !== undefined && { openStartTime: dto.openStartTime }),
        ...(dto.openEndTime !== undefined && { openEndTime: dto.openEndTime }),
        ...(dto.minDurationMinutes !== undefined && { minDurationMinutes: dto.minDurationMinutes }),
        ...(dto.minNoticeHours !== undefined && { minNoticeHours: dto.minNoticeHours }),
        ...(dto.accessMethod !== undefined && { accessMethod: dto.accessMethod }),
        ...(dto.accessInstructions !== undefined && { accessInstructions: dto.accessInstructions }),
        ...(dto.activityValidationRequired !== undefined && {
          activityValidationRequired: dto.activityValidationRequired,
        }),
        ...(dto.rcProRequired !== undefined && { rcProRequired: dto.rcProRequired }),
        ...(dto.houseRules !== undefined && { houseRules: dto.houseRules }),
      },
      include: { photos: { orderBy: { position: 'asc' } }, faqItems: { orderBy: { position: 'asc' } } },
    });

    return this.toResponseDto(updated);
  }

  async archive(id: string, currentUser: AuthenticatedUser): Promise<void> {
    await this.findAndVerifyAccess(id, currentUser);
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
    const listing = await this.findAndVerifyAccess(id, currentUser);

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
    await this.findAndVerifyAccess(id, currentUser);

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
    await this.findAndVerifyAccess(listingId, currentUser);

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
    await this.findAndVerifyAccess(listingId, currentUser);

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
      orderBy: { startAt: 'asc' },
    });
  }

  /**
   * Plages horodatées indisponibles pour un locataire : créneaux bloqués par
   * l'hôte + réservations actives. `end` exclusif, format ISO complet.
   */
  async getUnavailableRanges(
    listingId: string,
  ): Promise<{ start: string; end: string }[]> {
    const [blocks, bookings] = await Promise.all([
      this.prisma.listingAvailability.findMany({
        where: { listingId, isAvailable: false },
        select: { startAt: true, endAt: true },
      }),
      this.prisma.booking.findMany({
        where: { listingId, status: { in: ['PENDING', 'CONFIRMED'] } },
        select: { startAt: true, endAt: true },
      }),
    ]);
    return [...blocks, ...bookings]
      .map((r) => ({ start: r.startAt.toISOString(), end: r.endAt.toISOString() }))
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  /** Grille de créneaux réservables d'une journée donnée pour une annonce (public). */
  async getSlots(listingId: string, date: string): Promise<Slot[]> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Annonce introuvable');

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);

    const [bookings, blocks] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          listingId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        select: { startAt: true, endAt: true },
      }),
      this.prisma.listingAvailability.findMany({
        where: { listingId, isAvailable: false, startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
        select: { startAt: true, endAt: true },
      }),
    ]);

    const slots = generateDaySlots(listing, date);
    return markUnavailable(slots, [...bookings, ...blocks]);
  }

  async addAvailability(
    listingId: string,
    dto: CreateAvailabilityDto,
    currentUser: AuthenticatedUser,
  ): Promise<ListingAvailability> {
    await this.findAndVerifyAccess(listingId, currentUser);

    const dayStart = new Date(`${dto.date}T00:00:00.000Z`);
    const start = dto.startTime ? combineDateAndTime(dto.date, dto.startTime) : dayStart;
    const end = dto.endTime
      ? combineDateAndTime(dto.date, dto.endTime)
      : new Date(dayStart.getTime() + 24 * 3600 * 1000);

    if (end <= start) {
      throw new BadRequestException('endTime doit être postérieure à startTime');
    }

    const isAvailable = dto.isAvailable ?? true;

    // On ne compare qu'aux plages de MÊME nature : un créneau bloqué peut tout à fait
    // se situer à l'intérieur d'une fenêtre "disponible" (c'est le but).
    const overlapping = await this.prisma.listingAvailability.findFirst({
      where: {
        listingId,
        isAvailable,
        startAt: { lt: end },
        endAt: { gt: start },
      },
    });

    if (overlapping) {
      // Plage déjà couverte → idempotent (double-clic, état obsolète côté client).
      if (overlapping.startAt <= start && overlapping.endAt >= end) {
        return overlapping;
      }
      throw new ConflictException('Cette plage chevauche une disponibilité existante');
    }

    return this.prisma.listingAvailability.create({
      data: { listingId, startAt: start, endAt: end, isAvailable },
    });
  }

  async addFaqItem(
    listingId: string,
    dto: CreateFaqItemDto,
    currentUser: AuthenticatedUser,
  ): Promise<ListingFaqItem> {
    await this.findAndVerifyAccess(listingId, currentUser);
    const count = await this.prisma.listingFaqItem.count({ where: { listingId } });
    return this.prisma.listingFaqItem.create({
      data: {
        listingId,
        question: dto.question,
        answer: dto.answer,
        position: dto.position ?? count,
      },
    });
  }

  async updateFaqItem(
    listingId: string,
    faqId: string,
    dto: UpdateFaqItemDto,
    currentUser: AuthenticatedUser,
  ): Promise<ListingFaqItem> {
    await this.findAndVerifyAccess(listingId, currentUser);
    const item = await this.prisma.listingFaqItem.findUnique({ where: { id: faqId } });
    if (!item || item.listingId !== listingId) throw new NotFoundException('Question introuvable');

    return this.prisma.listingFaqItem.update({
      where: { id: faqId },
      data: {
        ...(dto.question !== undefined && { question: dto.question }),
        ...(dto.answer !== undefined && { answer: dto.answer }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
    });
  }

  async deleteFaqItem(
    listingId: string,
    faqId: string,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    await this.findAndVerifyAccess(listingId, currentUser);
    const item = await this.prisma.listingFaqItem.findUnique({ where: { id: faqId } });
    if (!item || item.listingId !== listingId) throw new NotFoundException('Question introuvable');
    await this.prisma.listingFaqItem.delete({ where: { id: faqId } });
  }

  async deleteAvailability(
    listingId: string,
    availId: string,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    await this.findAndVerifyAccess(listingId, currentUser);

    const avail = await this.prisma.listingAvailability.findUnique({ where: { id: availId } });
    if (!avail || avail.listingId !== listingId) {
      throw new NotFoundException('Disponibilité introuvable');
    }

    await this.prisma.listingAvailability.delete({ where: { id: availId } });
  }

  /** MODERATOR peut modérer n'importe quelle annonce. COMMERCIAL aussi, pour
   * l'instant, en l'absence d'une équipe modération dédiée — à retirer le jour
   * où ce n'est plus nécessaire. */
  static canModerate(user: AuthenticatedUser): boolean {
    return user.roles.includes('MODERATOR') || user.roles.includes('COMMERCIAL');
  }

  private async findAndVerifyAccess(
    listingId: string,
    currentUser: AuthenticatedUser,
  ): Promise<Listing> {
    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Annonce introuvable');
    if (listing.hostId !== currentUser.id && !ListingsService.canModerate(currentUser)) {
      throw new ForbiddenException("Vous n'êtes pas propriétaire de cette annonce");
    }
    return listing;
  }

  /**
   * Suppression définitive — réservée à la modération (pas aux hôtes, qui ont
   * déjà `archive()` pour retirer leurs propres annonces). Bloquée si des
   * réservations, conversations ou invitations y sont encore rattachées : on
   * préserve l'historique financier/légal plutôt que de le perdre en cascade.
   * Dans ce cas, l'archivage reste la marche à suivre.
   */
  async deletePermanently(listingId: string, currentUser: AuthenticatedUser): Promise<void> {
    if (!ListingsService.canModerate(currentUser)) {
      throw new ForbiddenException('Réservé à la modération');
    }

    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Annonce introuvable');

    const [bookingCount, conversationCount, invitationCount] = await Promise.all([
      this.prisma.booking.count({ where: { listingId } }),
      this.prisma.conversation.count({ where: { listingId } }),
      this.prisma.hostInvitation.count({ where: { listingId } }),
    ]);
    if (bookingCount > 0 || conversationCount > 0 || invitationCount > 0) {
      throw new ConflictException(
        "Cette annonce a un historique (réservations, messages ou invitation) — archivez-la plutôt que de la supprimer définitivement.",
      );
    }

    // Photos/FAQ/disponibilités sont en cascade côté schéma ; le reste a été
    // vérifié vide ci-dessus.
    await this.prisma.listing.delete({ where: { id: listingId } });
  }

  private toResponseDto(listing: ListingWithRelations): ListingResponseDto {
    return {
      id: listing.id,
      hostId: listing.hostId,
      type: listing.type,
      status: listing.status,
      verifiedAt: listing.verifiedAt ?? null,
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
      depositAmount: listing.depositAmount?.toString() ?? null,
      serviceFeeRateOverride: listing.serviceFeeRateOverride?.toString() ?? null,
      cancellationPolicy: listing.cancellationPolicy,
      instantBookEnabled: listing.instantBookEnabled,
      amenities: listing.amenities,
      specificAttributes: listing.specificAttributes,
      openDays: listing.openDays,
      openStartTime: listing.openStartTime,
      openEndTime: listing.openEndTime,
      minDurationMinutes: listing.minDurationMinutes,
      minNoticeHours: listing.minNoticeHours,
      accessMethod: listing.accessMethod,
      accessInstructions: listing.accessInstructions,
      activityValidationRequired: listing.activityValidationRequired,
      rcProRequired: listing.rcProRequired,
      houseRules: listing.houseRules,
      establishmentId: listing.establishmentId,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      photos: listing.photos,
      availabilities: listing.availabilities,
      faqItems: listing.faqItems,
      // L'hôte a-t-il finalisé son encaissement ? (ou flag démo « simulatePayments »)
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
