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
import { ListingType, PricingUnit, CancellationPolicy, AccessMethod } from '@prisma/client';

export class UpdateListingDto {
  @IsOptional() @IsEnum(ListingType)
  type?: ListingType;

  @IsOptional() @IsString() @MinLength(5) @MaxLength(200)
  title?: string;

  @IsOptional() @IsString() @MinLength(20) @MaxLength(5000)
  description?: string;

  @IsOptional() @IsString() @MaxLength(200)
  addressLine1?: string;

  @IsOptional() @IsString() @MaxLength(200)
  addressLine2?: string;

  @IsOptional() @IsString() @MaxLength(100)
  city?: string;

  @IsOptional() @IsString() @MaxLength(20)
  postalCode?: string;

  @IsOptional() @IsString() @MaxLength(2)
  country?: string;

  @IsOptional() @IsLatitude() @Type(() => Number)
  latitude?: number;

  @IsOptional() @IsLongitude() @Type(() => Number)
  longitude?: number;

  @IsOptional() @IsInt() @Min(1) @Max(100)
  maxGuests?: number;

  @IsOptional() @IsEnum(PricingUnit)
  pricingUnit?: PricingUnit;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Type(() => Number)
  basePrice?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Type(() => Number)
  cleaningFee?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Type(() => Number)
  depositAmount?: number;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) @Max(1) @Type(() => Number)
  serviceFeeRateOverride?: number;

  @IsOptional() @IsEnum(CancellationPolicy)
  cancellationPolicy?: CancellationPolicy;

  @IsOptional() @IsBoolean()
  instantBookEnabled?: boolean;

  @IsOptional() @IsBoolean()
  rcProRequired?: boolean;

  @IsOptional() @IsString() @MaxLength(3000)
  houseRules?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(20)
  faq?: { question: string; reponse: string }[];

  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(30)
  amenities?: string[];

  @IsOptional() @IsObject()
  specificAttributes?: Record<string, unknown>;

  // ── Accès (voir AccessMethodBlock côté front) ──────────────────────────────
  @IsOptional() @IsEnum(AccessMethod)
  accessMethod?: AccessMethod;

  @IsOptional() @IsString() @MaxLength(100)
  accessCode?: string;

  @IsOptional() @IsString() @MaxLength(100)
  wifiName?: string;

  @IsOptional() @IsString() @MaxLength(100)
  wifiPassword?: string;

  @IsOptional() @IsString() @MaxLength(30)
  contactPhone?: string;
}
