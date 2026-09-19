import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { AuthService } from '@/modules/auth/auth.service';
import type { CreateLeadDto } from './dto/create-lead.dto';
import type { AcceptInvitationDto } from './dto/accept-invitation.dto';
import type { TokenResponseDto } from '@/modules/auth/dto/token-response.dto';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class CommercialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /** Établissements déjà créés pour un hôte donné (choix "établissement existant" du wizard). */
  async findEstablishmentsByHostEmail(hostEmail: string) {
    const host = await this.prisma.user.findUnique({ where: { email: hostEmail } });
    if (!host) return [];
    return this.prisma.establishment.findMany({
      where: { hostId: host.id },
      include: { listings: { select: { id: true, title: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Crée une "fiche" complète en une transaction : hôte (existant ou nouveau,
   * sans mot de passe tant qu'il n'a pas activé son compte), établissement
   * (existant ou nouveau) et une annonce en statut PENDING_VALIDATION, puis une
   * invitation d'activation. Pas d'envoi d'email réel (aucun mailer dans le
   * projet) — le lien est loggé et renvoyé en clair hors production, comme
   * AuthService.forgotPassword.
   */
  async createLead(dto: CreateLeadDto, commercial: AuthenticatedUser) {
    return this.prisma.$transaction(async (tx) => {
      let host = await tx.user.findUnique({ where: { email: dto.host.email } });
      if (!host) {
        host = await tx.user.create({
          data: {
            email: dto.host.email,
            firstName: dto.host.firstName,
            lastName: dto.host.lastName,
            phone: dto.host.phone,
            roles: ['HOST'],
          },
        });
      } else if (!host.roles.includes('HOST')) {
        host = await tx.user.update({
          where: { id: host.id },
          data: { roles: { push: 'HOST' } },
        });
      }

      let establishment;
      if (dto.establishment.existingId) {
        establishment = await tx.establishment.findUnique({
          where: { id: dto.establishment.existingId },
        });
        if (!establishment || establishment.hostId !== host.id) {
          throw new NotFoundException('Établissement introuvable pour cet hôte');
        }
      } else {
        if (!dto.establishment.name || !dto.establishment.addressLine1 || !dto.establishment.city) {
          throw new BadRequestException(
            "Nom, adresse et ville de l'établissement sont requis pour une nouvelle fiche",
          );
        }
        establishment = await tx.establishment.create({
          data: {
            hostId: host.id,
            createdById: commercial.id,
            name: dto.establishment.name,
            addressLine1: dto.establishment.addressLine1,
            addressLine2: dto.establishment.addressLine2,
            city: dto.establishment.city,
            postalCode: dto.establishment.postalCode ?? '',
            country: dto.establishment.country ?? 'FR',
            latitude: dto.establishment.latitude,
            longitude: dto.establishment.longitude,
          },
        });
      }

      const listing = await tx.listing.create({
        data: {
          hostId: host.id,
          establishmentId: establishment.id,
          status: 'PENDING_VALIDATION',
          type: dto.listing.type,
          title: dto.listing.title,
          description: dto.listing.description,
          addressLine1: dto.listing.addressLine1,
          addressLine2: dto.listing.addressLine2,
          city: dto.listing.city,
          postalCode: dto.listing.postalCode,
          country: dto.listing.country ?? 'FR',
          latitude: dto.listing.latitude,
          longitude: dto.listing.longitude,
          maxGuests: dto.listing.maxGuests,
          pricingUnit: dto.listing.pricingUnit,
          basePrice: dto.listing.basePrice,
          cleaningFee: dto.listing.cleaningFee,
          depositAmount: dto.listing.depositAmount,
          serviceFeeRateOverride: dto.listing.serviceFeeRateOverride,
          cancellationPolicy: dto.listing.cancellationPolicy,
          instantBookEnabled: dto.listing.instantBookEnabled ?? false,
          amenities: dto.listing.amenities ?? [],
          specificAttributes:
            (dto.listing.specificAttributes as Prisma.InputJsonValue) ?? Prisma.JsonNull,
          openDays: dto.listing.openDays,
          openStartTime: dto.listing.openStartTime,
          openEndTime: dto.listing.openEndTime,
          minDurationMinutes: dto.listing.minDurationMinutes,
          minNoticeHours: dto.listing.minNoticeHours,
          accessMethod: dto.listing.accessMethod,
          accessInstructions: dto.listing.accessInstructions,
          activityValidationRequired: dto.listing.activityValidationRequired ?? false,
          rcProRequired: dto.listing.rcProRequired ?? false,
          houseRules: dto.listing.houseRules,
        },
      });

      const token = randomBytes(32).toString('hex');
      const invitation = await tx.hostInvitation.create({
        data: {
          establishmentId: establishment.id,
          listingId: listing.id,
          commercialId: commercial.id,
          hostEmail: dto.host.email,
          hostFirstName: dto.host.firstName,
          hostLastName: dto.host.lastName,
          hostPhone: dto.host.phone,
          token,
        },
      });

      const { hashedPassword: _hashedPassword, ...safeHost } = host;
      return { host: safeHost, establishment, listing, invitation, ...this.invitationUrl(token) };
    });
  }

  /** Historique des fiches créées par ce commercial (pour l'écran "Historique"). */
  async getHistory(commercialId: string) {
    return this.prisma.hostInvitation.findMany({
      where: { commercialId },
      include: {
        establishment: true,
        listing: { select: { id: true, title: true, status: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Aperçu public d'une invitation (écran d'activation du compte hôte). */
  async getInvitationPreview(token: string) {
    const invitation = await this.prisma.hostInvitation.findUnique({
      where: { token },
      include: { establishment: true, listing: true },
    });
    if (!invitation) throw new NotFoundException('Invitation introuvable');
    return invitation;
  }

  /** Active le compte hôte (mot de passe) et publie la fiche en DRAFT. Connecte
   * automatiquement l'hôte (comme après une inscription classique). */
  async acceptInvitation(token: string, dto: AcceptInvitationDto): Promise<TokenResponseDto> {
    const invitation = await this.prisma.hostInvitation.findUnique({
      where: { token },
      include: { establishment: true },
    });
    if (!invitation) throw new NotFoundException('Invitation introuvable');
    if (invitation.status !== 'SENT') {
      throw new BadRequestException('Cette invitation a déjà été utilisée ou a expiré');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const host = await this.prisma.$transaction(async (tx) => {
      await tx.hostInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
      if (invitation.listingId) {
        await tx.listing.update({
          where: { id: invitation.listingId },
          data: { status: 'DRAFT' },
        });
      }
      return tx.user.update({
        where: { id: invitation.establishment.hostId },
        data: { hashedPassword },
      });
    });

    return this.authService.issueTokens(host);
  }

  private invitationUrl(token: string): { devInvitationUrl?: string } {
    const url = `/invitation/${token}`;
    // Même logique que AuthService.forgotPassword : pas d'envoi d'email réel,
    // le lien est renvoyé en clair hors production pour être copié/partagé.
    return process.env.NODE_ENV === 'production' ? {} : { devInvitationUrl: url };
  }
}
