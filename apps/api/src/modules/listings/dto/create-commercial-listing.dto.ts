import { IsEmail, IsString, IsOptional, MaxLength, MinLength } from 'class-validator';
import { CreateListingDto } from './create-listing.dto';

// Création d'une fiche par un commercial pour le compte d'un hôte identifié par
// email — voir ListingsService.createForHost. Étend CreateListingDto avec les
// coordonnées du contact hôte (voir CommercialWizard § Destinataire, prototype).
export class CreateCommercialListingDto extends CreateListingDto {
  @IsEmail()
  hostEmail: string = '';

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  hostName: string = '';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  hostPhone?: string;

  // Libellé libre (ex. "Centre d'affaires Opéra") — informatif uniquement,
  // n'est pas une entité distincte côté données (pas de modèle "établissement").
  @IsOptional()
  @IsString()
  @MaxLength(200)
  establishment?: string;
}

export class CreateCommercialListingResponseDto {
  listing!: import('./listing-response.dto').ListingResponseDto;
  isNewHost = false;
  /** Lien d'activation — présent uniquement hors production (voir AuthService.forgotPassword). */
  devActivationUrl: string | null = null;
}
