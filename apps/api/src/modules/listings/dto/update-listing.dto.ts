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
  Matches,
  MinLength,
  MaxLength,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ListingType, PricingUnit, CancellationPolicy, AccessMethod } from '@prisma/client';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

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

  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(30)
  amenities?: string[];

  @IsOptional() @IsObject()
  specificAttributes?: Record<string, unknown>;

  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(0, { each: true }) @Max(6, { each: true })
  openDays?: number[];

  @IsOptional() @Matches(TIME_PATTERN)
  openStartTime?: string;

  @IsOptional() @Matches(TIME_PATTERN)
  openEndTime?: string;

  @IsOptional() @IsInt() @Min(15) @Max(1440)
  minDurationMinutes?: number;

  @IsOptional() @IsInt() @Min(0) @Max(720)
  minNoticeHours?: number;

  @IsOptional() @IsEnum(AccessMethod)
  accessMethod?: AccessMethod;

  @IsOptional() @IsString() @MaxLength(1000)
  accessInstructions?: string;

  @IsOptional() @IsBoolean()
  activityValidationRequired?: boolean;

  @IsOptional() @IsBoolean()
  rcProRequired?: boolean;

  @IsOptional() @IsString() @MaxLength(5000)
  houseRules?: string;
}
