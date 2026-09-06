import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join, resolve } from 'path';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // rawBody: true preserves the raw Buffer on req.rawBody — required for Stripe webhook signature verification
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('api/v1');

  // Fichiers uploadés (stockage local) servis en statique, hors préfixe /api/v1.
  const uploadsDir = process.env['UPLOADS_DIR']
    ? resolve(process.env['UPLOADS_DIR'])
    : join(process.cwd(), 'uploads');
  app.use(
    '/uploads',
    express.static(uploadsDir, {
      maxAge: '7d',
      fallthrough: false,
    }),
  );

  // Apply raw body parser ONLY to the Stripe webhook route, before the global JSON parser.
  // All other routes use the default JSON body parser provided by NestJS/Express.
  app.use(
    '/api/v1/payments/webhook',
    express.raw({ type: 'application/json' }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
}

void bootstrap();
