import { Test, type TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { StorageService } from '@/infrastructure/storage/storage.service';
import type { User } from '@prisma/client';

const mockUser: User = {
  id: 'user-1',
  email: 'alice@example.com',
  hashedPassword: 'hashed',
  firstName: 'Alice',
  lastName: 'Martin',
  avatarUrl: null,
  bio: null,
  phone: null,
  roles: ['TENANT'],
  identityStatus: 'UNVERIFIED',
  identityData: null,
  stripeAccountId: null,
  stripeAccountStatus: null,
  payoutLast4: null,
  payoutHolderName: null,
  stripeCustomerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function buildMockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('UsersService', () => {
  let service: UsersService;
  let prisma: ReturnType<typeof buildMockPrisma>;
  let storage: jest.Mocked<StorageService>;

  beforeEach(async () => {
    prisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: StorageService,
          useValue: { upload: jest.fn(), delete: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(UsersService);
    storage = module.get(StorageService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── updateProfile ─────────────────────────────────────────────────────────

  describe('updateProfile', () => {
    it('met à jour et retourne le profil', async () => {
      const updated = { ...mockUser, firstName: 'Alicia', bio: 'Hello' };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(updated);

      const result = await service.updateProfile('user-1', { firstName: 'Alicia', bio: 'Hello' });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
      expect(result.firstName).toBe('Alicia');
    });

    it('lance NotFoundException si utilisateur introuvable', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateProfile('unknown', { firstName: 'X' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── becomeHost ────────────────────────────────────────────────────────────

  describe('becomeHost', () => {
    it('ajoute le rôle HOST si absent', async () => {
      const withHost = { ...mockUser, roles: ['TENANT', 'HOST'] as ('TENANT' | 'HOST')[] };
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue(withHost);

      const result = await service.becomeHost('user-1');

      expect(prisma.user.update).toHaveBeenCalled();
      expect(result.roles).toContain('HOST');
    });

    it('ne modifie pas si HOST déjà présent', async () => {
      const alreadyHost = { ...mockUser, roles: ['TENANT', 'HOST'] as ('TENANT' | 'HOST')[] };
      prisma.user.findUnique.mockResolvedValue(alreadyHost);

      await service.becomeHost('user-1');

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ── uploadAvatar ──────────────────────────────────────────────────────────

  describe('uploadAvatar', () => {
    it('upload vers S3 et met à jour avatarUrl', async () => {
      const url = 'https://s3.example.com/users/user-1/avatar/uuid.jpg';
      prisma.user.findUnique.mockResolvedValue(mockUser);
      storage.upload.mockResolvedValue(url);
      prisma.user.update.mockResolvedValue({ ...mockUser, avatarUrl: url });

      const result = await service.uploadAvatar(
        'user-1',
        Buffer.from('fake-image'),
        'photo.jpg',
        'image/jpeg',
      );

      expect(storage.upload).toHaveBeenCalledWith(
        expect.stringContaining('users/user-1/avatar/'),
        expect.any(Buffer),
        'image/jpeg',
      );
      expect(result.avatarUrl).toBe(url);
    });

    it('lance BadRequestException pour un fichier non-image', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.uploadAvatar('user-1', Buffer.from('data'), 'doc.pdf', 'application/pdf'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
