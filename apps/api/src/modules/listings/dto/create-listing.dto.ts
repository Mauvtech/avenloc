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
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ListingType,
  PricingUnit,
  CancellationPolicy,
} from '@prisma/client';
import { CreateAvailabilityRuleDto } from './availability-rule.dto';

export class CreateListingDto {
  @IsEnum(ListingType)
  type: ListingType = ListingType.MEETING_ROOM;

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

  // Caution demandée au locataire (empreinte, non facturée). Null = aucune.
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  depositAmount?: number;

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

  // Assurance RC Pro exigée pour réserver — voir Booking.rcProConfirmed.
  @IsOptional()
  @IsBoolean()
  rcProRequired?: boolean = false;

  // Règlement intérieur affiché sur la fiche, à accepter obligatoirement à la réservation.
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  houseRules?: string;

  // FAQ — liste de { question, reponse }. Validée en objet libre côté DTO (souplesse
  // du wizard commercial qui peut envoyer 0 à N entrées) ; la structure est documentée
  // dans schema.prisma plutôt qu'imposée ici par une classe dédiée.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  faq?: { question: string; reponse: string }[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(30)
  amenities: string[] = [];

  @IsOptional()
  @IsObject()
  specificAttributes?: Record<string, unknown>;

  // Créneaux horaires hebdomadaires initiaux (pricingUnit = HOUR uniquement) —
  // créés dans la même opération que l'annonce. Évite un aller-retour séparé
  // (authentifié, gated sur la propriété) qui échouerait pour une création par
  // un commercial : l'hôte cible n'est pas l'utilisateur courant à ce moment-là.
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(14)
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityRuleDto)
  availabilityRules?: CreateAvailabilityRuleDto[];
}
