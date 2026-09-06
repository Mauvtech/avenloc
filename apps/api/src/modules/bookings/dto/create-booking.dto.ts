import {
  IsUUID,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  listingId: string = '';

  @IsDateString()
  startDate: string = '';

  @IsDateString()
  endDate: string = '';

  @IsInt()
  @Min(1)
  guestCount: number = 1;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  guestNote?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  arrivalTime?: string;
}
