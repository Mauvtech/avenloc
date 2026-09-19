import { IsDateString, IsBoolean, IsOptional, IsEnum, Matches } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateAvailabilityDto {
  @IsDateString()
  date: string = '';

  /** Omis = bloque/débloque la journée entière. */
  @IsOptional()
  @Matches(TIME_PATTERN)
  startTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN)
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean = true;
}

export class UpdateListingStatusDto {
  @IsEnum(['DRAFT', 'PUBLISHED'])
  status: 'DRAFT' | 'PUBLISHED' = 'DRAFT';
}
