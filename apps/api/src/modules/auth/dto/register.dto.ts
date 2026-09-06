import { IsEmail, IsString, IsIn, IsOptional, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string = '';

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(128)
  password: string = '';

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string = '';

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string = '';

  /**
   * Intention à l'inscription. `HOST` crée un compte à la fois locataire et hôte
   * (un hôte peut aussi réserver). Par défaut : locataire uniquement.
   */
  @IsOptional()
  @IsIn(['TENANT', 'HOST'])
  role?: 'TENANT' | 'HOST';
}
