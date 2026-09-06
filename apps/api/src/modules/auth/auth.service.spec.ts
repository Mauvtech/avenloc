import { Test, type TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { User } from '@prisma/client';

jest.mock('bcrypt');

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockUser: User = {
  id: 'user-uuid-1',
  email: 'alice@example.com',
  hashedPassword: 'hashed_password',
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
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockRefreshToken = {
  id: 'token-uuid-1',
  userId: mockUser.id,
  tokenHash: 'some_hash',
  expiresAt: new Date(Date.now() + 86400000),
  revokedAt: null,
  createdAt: new Date(),
  user: mockUser,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMockPrisma() {
  return {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    oAuthAccount: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof buildMockPrisma>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    prisma = buildMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { signAsync: jest.fn().mockResolvedValue('access_token_mock') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'jwt.refreshTtlSeconds') return 2592000;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── register ────────────────────────────────────────────────────────────────

  describe('register', () => {
    beforeEach(() => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
    });

    it('crée un utilisateur et retourne des tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'alice@example.com',
        password: 'password123',
        firstName: 'Alice',
        lastName: 'Martin',
      });

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'alice@example.com',
            hashedPassword: 'hashed_password',
          }),
        }),
      );
      expect(result).toMatchObject({
        accessToken: 'access_token_mock',
        tokenType: 'Bearer',
        expiresIn: 900,
      });
      expect(result.refreshToken).toBeTruthy();
    });

    it("lance ConflictException si l'email est déjà utilisé", async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'alice@example.com',
          password: 'password123',
          firstName: 'Alice',
          lastName: 'Martin',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('hache le mot de passe avec bcrypt (12 rounds)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(mockUser);

      await service.register({
        email: 'bob@example.com',
        password: 'mypassword',
        firstName: 'Bob',
        lastName: 'Dupont',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('mypassword', 12);
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────

  describe('login', () => {
    beforeEach(() => {
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
    });

    it('retourne des tokens avec des identifiants valides', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'alice@example.com',
        password: 'password123',
      });

      expect(result.accessToken).toBe('access_token_mock');
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: mockUser.id, email: mockUser.email }),
      );
    });

    it("lance UnauthorizedException si l'utilisateur n'existe pas", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lance UnauthorizedException si le mot de passe est incorrect', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'alice@example.com', password: 'wrong_password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("lance UnauthorizedException pour un compte OAuth sans mot de passe", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, hashedPassword: null });

      await expect(
        service.login({ email: 'alice@example.com', password: 'any_password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refreshTokens ────────────────────────────────────────────────────────────

  describe('refreshTokens', () => {
    const RAW_TOKEN = 'a'.repeat(128); // token opaque brut

    beforeEach(() => {
      prisma.refreshToken.create.mockResolvedValue(mockRefreshToken);
    });

    it('révoque l\'ancien token et retourne de nouveaux tokens', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(mockRefreshToken);
      prisma.refreshToken.update.mockResolvedValue({ ...mockRefreshToken, revokedAt: new Date() });

      const result = await service.refreshTokens(RAW_TOKEN);

      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockRefreshToken.id },
          data: { revokedAt: expect.any(Date) },
        }),
      );
      expect(result.accessToken).toBe('access_token_mock');
      expect(result.refreshToken).not.toBe(RAW_TOKEN); // nouveau token émis
    });

    it('lance UnauthorizedException si le token est révoqué', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        revokedAt: new Date('2024-01-01'),
      });

      await expect(service.refreshTokens(RAW_TOKEN)).rejects.toThrow(UnauthorizedException);
      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });

    it('lance UnauthorizedException si le token est expiré', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        ...mockRefreshToken,
        expiresAt: new Date('2020-01-01'), // passé
      });

      await expect(service.refreshTokens(RAW_TOKEN)).rejects.toThrow(UnauthorizedException);
    });

    it('lance UnauthorizedException si le token est introuvable', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refreshTokens(RAW_TOKEN)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ───────────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('révoque le refresh token', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('some_raw_token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { revokedAt: expect.any(Date) },
        }),
      );
    });

    it('est idempotent si le token est déjà révoqué', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.logout('already_revoked_token')).resolves.not.toThrow();
    });
  });
});
