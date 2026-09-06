import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import {
  PaymentIntentResponseDto,
  ConnectOnboardDto,
  ConnectStatusDto,
} from './dto/payment-response.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly config: ConfigService,
  ) {}

  // ── Onboarding hôte — Stripe Connect Express (page hébergée) ────────────────

  @Post('connect/onboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST')
  @HttpCode(HttpStatus.OK)
  onboard(@CurrentUser() user: AuthenticatedUser): Promise<ConnectOnboardDto> {
    return this.paymentsService.onboardHost(user.id);
  }

  @Get('connect/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST')
  @HttpCode(HttpStatus.OK)
  connectStatus(@CurrentUser() user: AuthenticatedUser): Promise<ConnectStatusDto> {
    return this.paymentsService.getConnectStatus(user.id);
  }

  // Retour éventuel via l'API (le return_url Stripe pointe directement sur le front).
  @Get('connect/return')
  connectReturn(@Res() res: Response): void {
    res.redirect(`${this.config.get<string>('frontend.url') ?? 'http://localhost:3000'}/host/connect/return`);
  }

  // ── PaymentIntent ────────────────────────────────────────────────────────────

  @Post('intent')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createIntent(
    @Body() dto: CreatePaymentIntentDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaymentIntentResponseDto> {
    return this.paymentsService.createPaymentIntent(dto.bookingId, user.id);
  }

  // ── Stripe Webhook ───────────────────────────────────────────────────────────
  // Raw body is preserved via { rawBody: true } in NestFactory.create (main.ts).
  // The express.raw() middleware is applied to this route before other body parsers.

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody || !signature) {
      throw new BadRequestException('Missing raw body or Stripe signature');
    }

    let event;
    try {
      event = this.paymentsService.constructWebhookEvent(rawBody, signature);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signature verification failed';
      throw new BadRequestException(`Webhook signature error: ${msg}`);
    }

    await this.paymentsService.handleWebhookEvent(event);
    return { received: true };
  }
}
