import {
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  IsArray,
  IsObject,
  IsLatitude,
  IsLongitude,
  MinLength,
  MaxLength,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ListingType,
  PricingUnit,
  CancellationPolicy,
} from '@prisma/client';

export class CreateListingDto {
  @IsEnum(ListingType)
  type: ListingType = ListingType.APARTMENT;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string = '';

  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description: string = '';

  @IsString()
  @MaxLength(200)
  addressLine1: string = '';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsString()
  @MaxLength(100)
  city: string = '';

  @IsString()
  @MaxLength(20)
  postalCode: string = '';

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string = 'FR';

  @IsLatitude()
  @Type(() => Number)
  latitude: number = 0;

  @IsLongitude()
  @Type(() => Number)
  longitude: number = 0;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxGuests?: number;

  @IsEnum(PricingUnit)
  pricingUnit: PricingUnit = PricingUnit.NIGHT;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  basePrice: number = 0;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  cleaningFee?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(1)
  @Type(() => Number)
  serviceFeeRateOverride?: number;

  @IsEnum(CancellationPolicy)
  cancellationPolicy: CancellationPolicy = CancellationPolicy.MODERATE;

  @IsBoolean()
  instantBookEnabled: boolean = false;

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  amenities: string[] = [];

  @IsOptional()
  @IsObject()
  specificAttributes?: Record<string, unknown>;
}
