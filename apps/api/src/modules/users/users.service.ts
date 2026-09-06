import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { UserProfileDto, PublicUserProfileDto } from './dto/user-profile.dto';
import type { User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.findOrThrow(userId);
    return this.toProfileDto(user);
  }

  async getPublicProfile(userId: string): Promise<PublicUserProfileDto> {
    const user = await this.findOrThrow(userId);
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileDto> {
    await this.findOrThrow(userId);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
      },
    });
    return this.toProfileDto(updated);
  }

  async uploadAvatar(
    userId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<UserProfileDto> {
    if (!mimeType.startsWith('image/')) {
      throw new BadRequestException("Le fichier doit être une image");
    }

    const ext = extname(originalName).toLowerCase() || '.jpg';
    const key = `users/${userId}/avatar/${randomUUID()}${ext}`;

    const url = await this.storage.upload(key, buffer, mimeType);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: url },
    });
    return this.toProfileDto(updated);
  }

  async becomeHost(userId: string): Promise<UserProfileDto> {
    const user = await this.findOrThrow(userId);

    if (user.roles.includes('HOST')) {
      return this.toProfileDto(user);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { roles: { push: 'HOST' } },
    });
    return this.toProfileDto(updated);
  }

  private async findOrThrow(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  private toProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      phone: user.phone,
      roles: user.roles,
      identityStatus: user.identityStatus,
      stripeAccountStatus: user.stripeAccountStatus,
      createdAt: user.createdAt,
    };
  }
}
