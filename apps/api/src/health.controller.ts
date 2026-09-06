import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './infrastructure/database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Sonde de liveness/readiness pour la plateforme d'hébergement.
  // GET /api/v1/health → 200 { status: 'ok', db: 'up' } si la base répond.
  @Get()
  async check(): Promise<{ status: string; db: string; uptime: number }> {
    let db = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = 'up';
    } catch {
      db = 'down';
    }
    return { status: db === 'up' ? 'ok' : 'degraded', db, uptime: process.uptime() };
  }
}
