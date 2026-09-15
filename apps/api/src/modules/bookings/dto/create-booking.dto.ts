import {
  IsUUID,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsBoolean,
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

  // Activité/usage prévu de l'espace — obligatoire côté service si
  // Listing.instantBookEnabled = false (voir BookingsService.create).
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  activityDescription?: string;

  // Confirmation d'assurance RC Pro — obligatoire côté service si Listing.rcProRequired.
  @IsOptional()
  @IsBoolean()
  rcProConfirmed?: boolean;

  // Acceptation du règlement intérieur — obligatoire côté service si Listing.houseRules renseigné.
  @IsOptional()
  @IsBoolean()
  houseRulesAccepted?: boolean;
}
