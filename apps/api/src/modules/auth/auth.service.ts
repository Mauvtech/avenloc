import {
  Injectable,
  Logger,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthProvider, UserRole, type User } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { RedisService } from '@/infrastructure/cache/redis.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import type { JwtPayload } from './strategies/jwt.strategy';
import type { GoogleProfile } from './strategies/google.strategy';

const EXCHANGE_CODE_TTL_SECONDS = 60;
const RESET_TOKEN_TTL_SECONDS = 15 * 60;

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 min

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {
    this.refreshTtlSeconds =
      this.config.get<number>('jwt.refreshTtlSeconds') ?? 30 * 24 * 60 * 60;
  }

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Un hôte est aussi locataire par défaut (il peut réserver des espaces).
    const roles: UserRole[] =
      dto.role === 'HOST' ? [UserRole.TENANT, UserRole.HOST] : [UserRole.TENANT];

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        roles,
      },
    });

    return this.generateTokens(user);
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.hashedPassword) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.hashedPassword);
    if (!passwordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    return this.generateTokens(user);
  }

  async refreshTokens(rawRefreshToken: string): Promise<TokenResponseDto> {
    const tokenHash = this.hashToken(rawRefreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }

    // Rotation : révocation de l'ancien token avant d'en émettre un nouveau
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.generateTokens(stored.user);
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawRefreshToken);

    // updateMany : idempotent si le token est déjà révoqué ou inexistant
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ── Réinitialisation de mot de passe ───────────────────────────────────────

  /**
   * Génère un jeton de réinitialisation (15 min, stocké haché en Redis).
   * Réponse volontairement neutre pour ne pas divulguer l'existence d'un compte.
   * En dev (NODE_ENV != production), le lien est renvoyé pour faciliter les tests.
   */
  async forgotPassword(email: string): Promise<{ devResetUrl?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return {};

    const token = randomBytes(32).toString('hex');
    await this.redis.set(
      `auth:reset:${this.hashToken(token)}`,
      user.id,
      RESET_TOKEN_TTL_SECONDS,
    );

    const frontendUrl =
      this.config.get<string>('frontend.url') ?? 'http://localhost:3000';
    const url = `${frontendUrl}/auth/reset?token=${token}`;
    this.logger.log(`Lien de réinitialisation pour ${email} : ${url}`);

    return this.config.get<string>('nodeEnv') === 'production'
      ? {}
      : { devResetUrl: url };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const key = `auth:reset:${this.hashToken(token)}`;
    const userId = await this.redis.get<string>(key);
    if (!userId) {
      throw new UnauthorizedException('Lien invalide ou expiré');
    }

    const hashedPassword = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedPassword },
    });

    // Invalide toutes les sessions existantes.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.redis.del(key);
  }

  async handleGoogleLogin(profile: GoogleProfile): Promise<TokenResponseDto> {
    const existing = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: AuthProvider.GOOGLE,
          providerAccountId: profile.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existing) {
      return this.generateTokens(existing.user);
    }

    // Tenter de lier à un compte existant par email (évite les comptes doublons)
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
        },
      });
    }

    await this.prisma.oAuthAccount.create({
      data: {
        userId: user.id,
        provider: AuthProvider.GOOGLE,
        providerAccountId: profile.providerAccountId,
        accessToken: profile.accessToken,
      },
    });

    return this.generateTokens(user);
  }

  private async generateTokens(user: User): Promise<TokenResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const rawRefreshToken = randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + this.refreshTtlSeconds * 1000);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    return new TokenResponseDto({
      accessToken,
      refreshToken: rawRefreshToken,
      tokenType: 'Bearer',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
  }

  // ── Google OAuth exchange code ─────────────────────────────────────────────
  // Génère un code opaque à usage unique (60s) stocké en Redis.
  // Le navigateur ne voit jamais les tokens — seulement ce code court.
  async generateExchangeCode(tokens: TokenResponseDto): Promise<string> {
    const code = randomBytes(32).toString('hex');
    await this.redis.set(`auth:exchange:${code}`, tokens, EXCHANGE_CODE_TTL_SECONDS);
    return code;
  }

  async exchangeCode(code: string): Promise<TokenResponseDto> {
    const key = `auth:exchange:${code}`;
    const tokens = await this.redis.get<TokenResponseDto>(key);
    if (!tokens) {
      throw new UnauthorizedException('Code expiré ou invalide');
    }
    await this.redis.del(key); // usage unique : suppression immédiate après lecture
    return tokens;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
