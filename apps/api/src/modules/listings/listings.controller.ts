import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { ReorderPhotosDto } from './dto/reorder-photos.dto';
import type { ListingResponseDto } from './dto/listing-response.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { ListingAvailability, ListingPhoto } from '@prisma/client';
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
}
