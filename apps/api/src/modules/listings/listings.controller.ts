import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  Optional,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { CreateAvailabilityDto, UpdateListingStatusDto } from './dto/availability.dto';
import { CreateAvailabilityRuleDto, ManagedSlotDto, SlotDto } from './dto/availability-rule.dto';
import {
  CreateCommercialListingDto,
  CreateCommercialListingResponseDto,
} from './dto/create-commercial-listing.dto';
import { ReorderPhotosDto } from './dto/reorder-photos.dto';
import type { ListingResponseDto } from './dto/listing-response.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { ListingAvailability, ListingAvailabilityRule, ListingPhoto } from '@prisma/client';
import type { Express } from 'express';

@Controller('listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('HOST')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateListingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListingResponseDto> {
    return this.listingsService.create(dto, user);
  }

  // Création pour le compte d'un hôte par un commercial (ou par l'hôte lui-même,
  // le wizard front réutilise cette route dans les deux contextes). Aucun rôle
  // dédié requis — voir ListingsService.createForHost.
  @Post('commercial')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  createForHost(
    @Body() dto: CreateCommercialListingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CreateCommercialListingResponseDto> {
    return this.listingsService.createForHost(dto, user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyListings(@CurrentUser() user: AuthenticatedUser): Promise<ListingResponseDto[]> {
    return this.listingsService.findMyListings(user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ): Promise<ListingResponseDto> {
    return this.listingsService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateListingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListingResponseDto> {
    return this.listingsService.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.listingsService.archive(id, user);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateListingStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListingResponseDto> {
    return this.listingsService.updateStatus(id, dto.status, user);
  }

  @Post(':id/photos')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  @HttpCode(HttpStatus.CREATED)
  uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListingPhoto> {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    return this.listingsService.uploadPhoto(id, file.buffer, file.originalname, file.mimetype, user);
  }

  @Patch(':id/photos/reorder')
  @UseGuards(JwtAuthGuard)
  reorderPhotos(
    @Param('id') id: string,
    @Body() dto: ReorderPhotosDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListingPhoto[]> {
    return this.listingsService.reorderPhotos(id, dto.order, user);
  }

  @Delete(':id/photos/:photoId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deletePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.listingsService.deletePhoto(id, photoId, user);
  }

  @Get(':id/availability')
  getAvailabilities(@Param('id') id: string): Promise<ListingAvailability[]> {
    return this.listingsService.getAvailabilities(id);
  }

  @Get(':id/unavailable')
  getUnavailable(
    @Param('id') id: string,
  ): Promise<{ start: string; end: string }[]> {
    return this.listingsService.getUnavailableRanges(id);
  }

  @Post(':id/availability')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  addAvailability(
    @Param('id') id: string,
    @Body() dto: CreateAvailabilityDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListingAvailability> {
    return this.listingsService.addAvailability(id, dto, user);
  }

  @Delete(':id/availability/:availId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAvailability(
    @Param('id') id: string,
    @Param('availId') availId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.listingsService.deleteAvailability(id, availId, user);
  }

  // ── Créneaux horaires (pricingUnit = HOUR) ──────────────────────────────────

  @Get(':id/availability-rules')
  getAvailabilityRules(@Param('id') id: string): Promise<ListingAvailabilityRule[]> {
    return this.listingsService.getAvailabilityRules(id);
  }

  @Post(':id/availability-rules')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  addAvailabilityRule(
    @Param('id') id: string,
    @Body() dto: CreateAvailabilityRuleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ListingAvailabilityRule> {
    return this.listingsService.addAvailabilityRule(id, dto, user);
  }

  @Delete(':id/availability-rules/:ruleId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAvailabilityRule(
    @Param('id') id: string,
    @Param('ruleId') ruleId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.listingsService.deleteAvailabilityRule(id, ruleId, user);
  }

  @Get(':id/slots')
  getSlots(@Param('id') id: string, @Query('date') date: string): Promise<SlotDto[]> {
    return this.listingsService.getSlots(id, date);
  }

  // Vue hôte (calendrier) : tous les créneaux du jour avec leur statut, pour
  // sélectionner ceux à bloquer/débloquer — voir SpaceWizard/HostCalendar front.
  @Get(':id/slots/manage')
  @UseGuards(JwtAuthGuard)
  getSlotsForManagement(
    @Param('id') id: string,
    @Query('date') date: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ManagedSlotDto[]> {
    return this.listingsService.getSlotsForManagement(id, date, user);
  }
}
