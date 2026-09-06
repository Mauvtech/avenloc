import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QuoteDto, QuoteResponseDto } from './dto/quote.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  // Public : aperçu de prix avant réservation (aucune donnée créée).
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  quote(@Body() dto: QuoteDto): Promise<QuoteResponseDto> {
    return this.bookingsService.quote(dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.create(dto, user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('role') role: 'tenant' | 'host' = 'tenant',
  ) {
    return this.bookingsService.findAll(user, role);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.findOne(id, user);
  }

  @Post(':id/approve')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.approve(id, user);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  reject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.reject(id, user);
  }

  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.cancel(id, user);
  }

  @Post(':id/complete')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  complete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.complete(id, user);
  }
}
