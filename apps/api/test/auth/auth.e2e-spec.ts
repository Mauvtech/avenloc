import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import * as bcrypt from 'bcrypt';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { User } from '@prisma/client';

// ── Mock PrismaService ────────────────────────────────────────────────────────
// Les tests e2e Auth utilisent un PrismaService mocké pour éviter la dépendance
// à une base de données réelle. Les tests d'intégration DB-réelle sont réservés
// aux endpoints critiques (réservation, paiement) dans test/bookings/ et test/payments/.

const HASHED_PASSWORD = bcrypt.hashSync('password123', 1); // rounds=1 pour la rapidité en test

const storedUsers = new Map<string, User>();
const storedRefreshTokens = new Map<string, { hash: string; userId: string; revokedAt: Date | null; expiresAt: Date }>();

function mockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-uuid-e2e',
    email: 'alice@example.com',
    hashedPassword: HASHED_PASSWORD,
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
    ...overrides,
  };
}

const mockPrisma = {
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
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
    storedUsers.clear();
    storedRefreshTokens.clear();
  });

  // ── POST /auth/register ────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('201 — crée un utilisateur et retourne des tokens', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(mockUser());
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-uuid-e2e',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        createdAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'password123',
          firstName: 'Alice',
          lastName: 'Martin',
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: 900,
      });
    });

    it('409 — email déjà utilisé', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser());

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'password123',
          firstName: 'Alice',
          lastName: 'Martin',
        });

      expect(response.status).toBe(409);
    });

    it('400 — payload invalide (email manquant)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ password: 'password123', firstName: 'Alice', lastName: 'Martin' });

      expect(response.status).toBe(400);
    });

    it('400 — mot de passe trop court (< 8 caractères)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'test@test.com', password: 'short', firstName: 'A', lastName: 'B' });

      expect(response.status).toBe(400);
    });
  });

  // ── POST /auth/login ───────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    beforeEach(() => {
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-uuid-e2e',
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        createdAt: new Date(),
      });
    });

    it('200 — identifiants valides', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser());

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        tokenType: 'Bearer',
      });
    });

    it('401 — utilisateur inconnu', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'unknown@example.com', password: 'password123' });

      expect(response.status).toBe(401);
    });

    it('401 — mot de passe incorrect', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser());

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'wrong_password' });

      expect(response.status).toBe(401);
    });
  });

  // ── POST /auth/refresh ─────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('200 — refresh token valide, nouveaux tokens émis', async () => {
      const alice = mockUser();
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: alice.id,
        tokenHash: 'any',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        createdAt: new Date(),
        user: alice,
      });
      mockPrisma.refreshToken.update.mockResolvedValue({});
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'rt-2',
        userId: alice.id,
        tokenHash: 'new_hash',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        createdAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'a'.repeat(128) });

      expect(response.status).toBe(200);
      expect(response.body.accessToken).toBeTruthy();
    });

    it('401 — refresh token révoqué', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-uuid-e2e',
        tokenHash: 'any',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: new Date('2024-01-01'), // révoqué
        createdAt: new Date(),
        user: mockUser(),
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'a'.repeat(128) });

      expect(response.status).toBe(401);
    });

    it('401 — refresh token expiré', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-uuid-e2e',
        tokenHash: 'any',
        expiresAt: new Date('2020-01-01'), // expiré
        revokedAt: null,
        createdAt: new Date(),
        user: mockUser(),
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'a'.repeat(128) });

      expect(response.status).toBe(401);
    });
  });

  // ── POST /auth/logout ──────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('204 — révocation réussie', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'any_token' });

      expect(response.status).toBe(204);
    });

    it('204 — idempotent sur token déjà révoqué (pas d\'erreur)', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: 'already_gone' });

      expect(response.status).toBe(204);
    });
  });

  // ── GET /auth/me ───────────────────────────────────────────────────────────

  describe('GET /api/v1/auth/me', () => {
    it('200 — retourne le profil du user connecté', async () => {
      // Obtenir un vrai access token via login
      const alice = mockUser();
      mockPrisma.user.findUnique.mockResolvedValue(alice);
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'rt-1', userId: alice.id, tokenHash: 'h',
        expiresAt: new Date(Date.now() + 86400000), revokedAt: null, createdAt: new Date(),
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'alice@example.com', password: 'password123' });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.body as { accessToken: string };

      const meRes = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body).toMatchObject({ id: alice.id, email: alice.email });
    });

    it('401 — sans access token', async () => {
      const response = await request(app.getHttpServer()).get('/api/v1/auth/me');
      expect(response.status).toBe(401);
    });

    it('401 — access token invalide (signature incorrecte)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer not.a.valid.jwt');

      expect(response.status).toBe(401);
    });
  });
});
