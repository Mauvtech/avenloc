import {
  IsUUID,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
  Matches,
  Min,
  MaxLength,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateBookingDto {
  @IsUUID()
  listingId: string = '';

  @IsDateString()
  date: string = '';

  @Matches(TIME_PATTERN, { message: 'startTime doit être au format HH:mm' })
  startTime: string = '';

  @Matches(TIME_PATTERN, { message: 'endTime doit être au format HH:mm' })
  endTime: string = '';

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

  /** Requis si Listing.activityValidationRequired est vrai. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  activityDescription?: string;

  /** Doit être true si Listing.rcProRequired est vrai. */
  @IsOptional()
  @IsBoolean()
  rcProAccepted?: boolean;

  /** Toujours requis (case à cocher obligatoire du règlement intérieur). */
  @IsBoolean()
  houseRulesAccepted: boolean = false;
}
