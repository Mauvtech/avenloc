import { IsDateString, IsBoolean, IsOptional, IsEnum } from 'class-validator';

export class CreateAvailabilityDto {
  @IsDateString()
  startDate: string = '';

  @IsDateString()
  endDate: string = '';

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean = true;
}

export class UpdateListingStatusDto {
  @IsEnum(['DRAFT', 'PUBLISHED'])
  status: 'DRAFT' | 'PUBLISHED' = 'DRAFT';
}
