import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { ListingStatus, BookingStatus, PricingUnit, Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { FeaturesService } from '@/modules/features/features.service';
import { AuthService } from '@/modules/auth/auth.service';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { CreateListingDto } from './dto/create-listing.dto';
import type { UpdateListingDto } from './dto/update-listing.dto';
import type { CreateAvailabilityDto } from './dto/availability.dto';
import type { CreateAvailabilityRuleDto, ManagedSlotDto, SlotDto } from './dto/availability-rule.dto';
import type {
  CreateCommercialListingDto,
  CreateCommercialListingResponseDto,
} from './dto/create-commercial-listing.dto';
import type { ListingResponseDto } from './dto/listing-response.dto';
import { UserRole } from '@prisma/client';
import type { Listing, ListingAvailability, ListingAvailabilityRule, ListingPhoto } from '@prisma/client';

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
        identityStatus?: string;
      }
    | null;
};

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly features: FeaturesService,
    private readonly authService: AuthService,
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
        rcProRequired: dto.rcProRequired ?? false,
        houseRules: dto.houseRules,
        faq: (dto.faq as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        amenities: dto.amenities ?? [],
        specificAttributes: dto.specificAttributes as Prisma.InputJsonValue ?? Prisma.JsonNull,
      },
      include: { photos: true },
    });

    await this.createInitialAvailabilityRules(listing.id, listing.pricingUnit, dto.availabilityRules);

    return this.toResponseDto(listing);
  }

  /** Voir CreateListingDto.availabilityRules. */
  private async createInitialAvailabilityRules(
    listingId: string,
    pricingUnit: PricingUnit,
    rules: CreateAvailabilityRuleDto[] | undefined,
  ): Promise<void> {
    if (!rules?.length || pricingUnit !== PricingUnit.HOUR) return;
    await this.prisma.listingAvailabilityRule.createMany({
      data: rules.map((r) => ({
        listingId,
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        minDurationMinutes: r.minDurationMinutes ?? 60,
        minLeadTimeMinutes: r.minLeadTimeMinutes ?? 0,
      })),
    });
  }

  /**
   * Création par un commercial pour le compte d'un hôte identifié par email
   * (voir CommercialWizard § Destinataire dans le design de référence). N'importe
   * quel utilisateur connecté peut appeler cette route — il n'existe pas de rôle
   * "commercial" dédié, exactement comme dans le prototype (l'accès à l'espace
   * commercial n'est gated que par une connexion, pas par une permission).
   *
   * Si l'email ne correspond à aucun compte, un compte hôte est créé sans mot de
   * passe et un lien d'activation est généré (AuthService.inviteHost, durée de
   * vie 7 jours — plus longue qu'un simple reset de mot de passe) — l'hôte
   * choisit son mot de passe via l'écran /auth/reset déjà en place.
   */
  async createForHost(
    dto: CreateCommercialListingDto,
    currentUser: AuthenticatedUser,
  ): Promise<CreateCommercialListingResponseDto> {
    let host = await this.prisma.user.findUnique({ where: { email: dto.hostEmail } });
    let isNewHost = false;

    if (!host) {
      isNewHost = true;
      const [firstName, ...rest] = dto.hostName.trim().split(/\s+/);
      const lastName = rest.join(' ');
      host = await this.prisma.user.create({
        data: {
          email: dto.hostEmail,
          firstName: firstName || dto.hostName.trim(),
          lastName,
          phone: dto.hostPhone,
          roles: [UserRole.HOST, UserRole.TENANT],
        },
      });
    } else if (!host.roles.includes(UserRole.HOST)) {
      host = await this.prisma.user.update({
        where: { id: host.id },
        data: { roles: [...host.roles, UserRole.HOST] },
      });
    }

    const listing = await this.prisma.listing.create({
      data: {
        hostId: host.id,
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
        rcProRequired: dto.rcProRequired ?? false,
        houseRules: dto.houseRules,
        faq: (dto.faq as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        amenities: dto.amenities ?? [],
        specificAttributes: (dto.specificAttributes as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        createdByCommercial: true,
      },
      include: { photos: true },
    });

    await this.createInitialAvailabilityRules(listing.id, listing.pricingUnit, dto.availabilityRules);

    let devActivationUrl: string | null = null;
    if (isNewHost) {
      const { devActivationUrl: url } = await this.authService.inviteHost(host.id, dto.hostEmail);
      devActivationUrl = url ?? null;
    }

    return {
      listing: this.toResponseDto(listing),
      isNewHost,
      devActivationUrl,
    };
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
            identityStatus: true,
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

    // Interdire uniquement la modification des conditions structurelles/financières
    // (prix, type, adresse, politique...) si une réservation CONFIRMED est active —
    // ces champs sont contractuels pour le locataire. Les champs informatifs (accès,
    // wifi, règlement, FAQ, photos...) restent modifiables à tout moment : le host
    // doit pouvoir mettre à jour un code d'accès même avec des réservations en cours.
    const STRUCTURAL_FIELDS = [
      'type',
      'addressLine1',
      'addressLine2',
      'city',
      'postalCode',
      'country',
      'latitude',
      'longitude',
      'maxGuests',
      'pricingUnit',
      'basePrice',
      'cleaningFee',
      'depositAmount',
      'serviceFeeRateOverride',
      'cancellationPolicy',
      'instantBookEnabled',
    ] as const;
    const touchesStructuralField = STRUCTURAL_FIELDS.some((field) => dto[field] !== undefined);
    if (touchesStructuralField) {
      const activeBooking = await this.prisma.booking.findFirst({
        where: { listingId: id, status: BookingStatus.CONFIRMED },
      });
      if (activeBooking) {
        throw new ConflictException(
          'Impossible de modifier les conditions (prix, type, adresse...) d\'une annonce avec des réservations confirmées actives',
        );
      }
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
        ...(dto.rcProRequired !== undefined && { rcProRequired: dto.rcProRequired }),
        ...(dto.houseRules !== undefined && { houseRules: dto.houseRules }),
        ...(dto.faq !== undefined && { faq: dto.faq as Prisma.InputJsonValue }),
        ...(dto.amenities !== undefined && { amenities: dto.amenities }),
        ...(dto.specificAttributes !== undefined && { specificAttributes: dto.specificAttributes as Prisma.InputJsonValue }),
        ...(dto.accessMethod !== undefined && { accessMethod: dto.accessMethod }),
        ...(dto.accessCode !== undefined && { accessCode: dto.accessCode }),
        ...(dto.wifiName !== undefined && { wifiName: dto.wifiName }),
        ...(dto.wifiPassword !== undefined && { wifiPassword: dto.wifiPassword }),
        ...(dto.contactPhone !== undefined && { contactPhone: dto.contactPhone }),
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

  // ── Créneaux horaires (pricingUnit = HOUR) ──────────────────────────────────

  async getAvailabilityRules(listingId: string): Promise<ListingAvailabilityRule[]> {
    return this.prisma.listingAvailabilityRule.findMany({
      where: { listingId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async addAvailabilityRule(
    listingId: string,
    dto: CreateAvailabilityRuleDto,
    currentUser: AuthenticatedUser,
  ): Promise<ListingAvailabilityRule> {
    const listing = await this.findAndVerifyOwnership(listingId, currentUser);

    if (listing.pricingUnit !== PricingUnit.HOUR) {
      throw new BadRequestException(
        'Les créneaux horaires ne concernent que les annonces facturées à l’heure',
      );
    }
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('endTime doit être postérieure à startTime');
    }

    return this.prisma.listingAvailabilityRule.create({
      data: {
        listingId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        minDurationMinutes: dto.minDurationMinutes ?? 60,
        minLeadTimeMinutes: dto.minLeadTimeMinutes ?? 0,
      },
    });
  }

  async deleteAvailabilityRule(
    listingId: string,
    ruleId: string,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    await this.findAndVerifyOwnership(listingId, currentUser);

    const rule = await this.prisma.listingAvailabilityRule.findUnique({ where: { id: ruleId } });
    if (!rule || rule.listingId !== listingId) {
      throw new NotFoundException('Règle introuvable');
    }

    await this.prisma.listingAvailabilityRule.delete({ where: { id: ruleId } });
  }

  /**
   * Créneaux horaires disponibles pour une annonce HOUR à une date donnée.
   * Découpe chaque ListingAvailabilityRule du jour en tranches de minDurationMinutes,
   * retire ce qui chevauche un blocage hôte ou une réservation active, et ce qui
   * commence avant now() + minLeadTimeMinutes. Voir schema.prisma § ListingAvailabilityRule.
   */
  async getSlots(listingId: string, dateStr: string): Promise<SlotDto[]> {
    if (!dateStr) throw new BadRequestException('Le paramètre date est requis (YYYY-MM-DD)');

    const listing = await this.prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) throw new NotFoundException('Annonce introuvable');
    if (listing.pricingUnit !== PricingUnit.HOUR) {
      throw new BadRequestException('Cette annonce ne propose pas de créneaux horaires');
    }

    const dayStart = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(dayStart.getTime())) {
      throw new BadRequestException('Date invalide (attendu YYYY-MM-DD)');
    }
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayOfWeek = dayStart.getDay();

    const rules = await this.prisma.listingAvailabilityRule.findMany({
      where: { listingId, dayOfWeek },
    });
    if (rules.length === 0) return [];

    const [blocks, bookings] = await Promise.all([
      this.prisma.listingAvailability.findMany({
        where: {
          listingId,
          isAvailable: false,
          startDate: { lt: dayEnd },
          endDate: { gt: dayStart },
        },
      }),
      this.prisma.booking.findMany({
        where: {
          listingId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          startDate: { lt: dayEnd },
          endDate: { gt: dayStart },
        },
      }),
    ]);

    const now = new Date();
    const bySlotStart = new Map<number, SlotDto>();

    for (const rule of rules) {
      const [startH, startM] = rule.startTime.split(':').map(Number);
      const [endH, endM] = rule.endTime.split(':').map(Number);
      const ruleEnd = new Date(dayStart);
      ruleEnd.setHours(endH, endM, 0, 0);
      const stepMs = rule.minDurationMinutes * 60 * 1000;
      const leadCutoff = new Date(now.getTime() + rule.minLeadTimeMinutes * 60 * 1000);

      let cursor = new Date(dayStart);
      cursor.setHours(startH, startM, 0, 0);

      while (cursor.getTime() + stepMs <= ruleEnd.getTime()) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + stepMs);

        const overlapsBlock = blocks.some(
          (b) => slotStart < b.endDate && slotEnd > b.startDate,
        );
        const overlapsBooking = bookings.some(
          (b) => slotStart < b.endDate && slotEnd > b.startDate,
        );
        const tooSoon = slotStart < leadCutoff;

        if (!overlapsBlock && !overlapsBooking && !tooSoon) {
          bySlotStart.set(slotStart.getTime(), {
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
        cursor = slotEnd;
      }
    }

    return [...bySlotStart.values()].sort((a, b) => a.start.localeCompare(b.start));
  }

  /**
   * Vue hôte du calendrier pour une annonce HOUR à une date donnée : TOUS les
   * créneaux possibles du jour (issus des règles), chacun étiqueté disponible /
   * réservé / bloqué — contrairement à getSlots() qui ne renvoie que les
   * créneaux réservables. Le délai minimum (minLeadTimeMinutes) n'est pas
   * appliqué ici : l'hôte doit voir et pouvoir gérer tous les créneaux du jour,
   * y compris ceux trop proches pour qu'un locataire les réserve.
   */
  async getSlotsForManagement(
    listingId: string,
    dateStr: string,
    currentUser: AuthenticatedUser,
  ): Promise<ManagedSlotDto[]> {
    const listing = await this.findAndVerifyOwnership(listingId, currentUser);
    if (listing.pricingUnit !== PricingUnit.HOUR) {
      throw new BadRequestException('Cette annonce ne propose pas de créneaux horaires');
    }
    if (!dateStr) throw new BadRequestException('Le paramètre date est requis (YYYY-MM-DD)');

    const dayStart = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(dayStart.getTime())) {
      throw new BadRequestException('Date invalide (attendu YYYY-MM-DD)');
    }
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const dayOfWeek = dayStart.getDay();

    const rules = await this.prisma.listingAvailabilityRule.findMany({
      where: { listingId, dayOfWeek },
    });
    if (rules.length === 0) return [];

    const [blocks, bookings] = await Promise.all([
      this.prisma.listingAvailability.findMany({
        where: { listingId, isAvailable: false, startDate: { lt: dayEnd }, endDate: { gt: dayStart } },
      }),
      this.prisma.booking.findMany({
        where: {
          listingId,
          status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
          startDate: { lt: dayEnd },
          endDate: { gt: dayStart },
        },
      }),
    ]);

    const bySlotStart = new Map<number, ManagedSlotDto>();

    for (const rule of rules) {
      const [startH, startM] = rule.startTime.split(':').map(Number);
      const [endH, endM] = rule.endTime.split(':').map(Number);
      const ruleEnd = new Date(dayStart);
      ruleEnd.setHours(endH, endM, 0, 0);
      const stepMs = rule.minDurationMinutes * 60 * 1000;

      let cursor = new Date(dayStart);
      cursor.setHours(startH, startM, 0, 0);

      while (cursor.getTime() + stepMs <= ruleEnd.getTime()) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + stepMs);

        const booking = bookings.find((b) => slotStart < b.endDate && slotEnd > b.startDate);
        const block = blocks.find((b) => slotStart < b.endDate && slotEnd > b.startDate);

        bySlotStart.set(slotStart.getTime(), {
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          status: booking ? 'booked' : block ? 'blocked' : 'available',
          availabilityId: block?.id ?? null,
        });
        cursor = slotEnd;
      }
    }

    return [...bySlotStart.values()].sort((a, b) => a.start.localeCompare(b.start));
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
      depositAmount: listing.depositAmount?.toString() ?? null,
      serviceFeeRateOverride: listing.serviceFeeRateOverride?.toString() ?? null,
      cancellationPolicy: listing.cancellationPolicy,
      instantBookEnabled: listing.instantBookEnabled,
      createdByCommercial: listing.createdByCommercial,
      accessMethod: listing.accessMethod,
      accessCode: listing.accessCode,
      wifiName: listing.wifiName,
      wifiPassword: listing.wifiPassword,
      contactPhone: listing.contactPhone,
      rcProRequired: listing.rcProRequired,
      houseRules: listing.houseRules,
      faq: listing.faq,
      amenities: listing.amenities,
      specificAttributes: listing.specificAttributes,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      photos: listing.photos,
      availabilities: listing.availabilities,
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
            verified: listing.host.identityStatus === 'VERIFIED',
          }
        : null,
    };
  }
}
