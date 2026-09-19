import { IsEmail, IsString, IsOptional, IsUUID, ValidateNested, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateListingDto } from '@/modules/listings/dto/create-listing.dto';

export class LeadHostDto {
  @IsEmail()
  email: string = '';

  @IsString()
  @MaxLength(100)
  firstName: string = '';

  @IsString()
  @MaxLength(100)
  lastName: string = '';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;
}

export class LeadEstablishmentDto {
  /** Renseigné si l'espace s'ajoute à un établissement déjà créé pour cet hôte. */
  @IsOptional()
  @IsUUID()
  existingId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  longitude?: number;
}

/** Une "fiche" créée par un commercial en visite terrain : hôte (existant ou
 * nouveau) + établissement (existant ou nouveau) + une annonce prête à publier. */
export class CreateLeadDto {
  @ValidateNested()
  @Type(() => LeadHostDto)
  host: LeadHostDto = new LeadHostDto();

  @ValidateNested()
  @Type(() => LeadEstablishmentDto)
  establishment: LeadEstablishmentDto = new LeadEstablishmentDto();

  @ValidateNested()
  @Type(() => CreateListingDto)
  listing: CreateListingDto = new CreateListingDto();
}
