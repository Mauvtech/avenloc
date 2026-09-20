import { ListingType } from '@prisma/client';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateFeaturesDto {
  @IsOptional()
  @IsBoolean()
  simulatePayments?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(ListingType, { each: true })
  enabledListingTypes?: ListingType[];
}
