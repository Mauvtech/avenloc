import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { DepositsService } from './deposits.service';
import { RequestCaptureDto } from './dto/request-capture.dto';
import { RespondCaptureDto } from './dto/respond-capture.dto';
import type { DepositResponseDto } from './dto/deposit-response.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { Express } from 'express';

@Controller('bookings/:bookingId/deposit')
@UseGuards(JwtAuthGuard)
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Get()
  get(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DepositResponseDto | null> {
    return this.depositsService.getForUser(bookingId, user.id);
  }

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FilesInterceptor('files', 3, { limits: { fileSize: 10 * 1024 * 1024 } }))
  async claim(
    @Param('bookingId') bookingId: string,
    @Body() dto: RequestCaptureDto,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: true }> {
    await this.depositsService.requestCapture(bookingId, user.id, dto, files ?? []);
    return { ok: true };
  }

  @Post('respond')
  @HttpCode(HttpStatus.OK)
  async respond(
    @Param('bookingId') bookingId: string,
    @Body() dto: RespondCaptureDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ ok: true }> {
    await this.depositsService.respond(bookingId, user.id, dto.decision, dto.contestReason);
    return { ok: true };
  }
}
