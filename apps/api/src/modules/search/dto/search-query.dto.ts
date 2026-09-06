import {
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  Min,
  Max,
  IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ListingType } from '@prisma/client';

export class SearchQueryDto {
  // Optionnels : sans coordonnées, la recherche renvoie toutes les annonces
  // publiées (page d'accueil), triées par date.
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  lng?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(100)
  @Type(() => Number)
  radius: number = 10;

  @IsOptional()
  @IsEnum(ListingType)
  type?: ListingType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxGuests?: number;

  // Comma-separated list, e.g. "wifi,parking"
  @IsOptional()
  @IsString()
  amenities?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit: number = 20;

  @IsOptional()
  @IsEnum(['price_asc', 'price_desc', 'distance', 'newest'])
  sort: 'price_asc' | 'price_desc' | 'distance' | 'newest' = 'distance';

  get amenitiesArray(): string[] {
    if (!this.amenities) return [];
    return this.amenities.split(',').map((a) => a.trim()).filter(Boolean);
  }
}
