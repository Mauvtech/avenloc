import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail()
  email: string = '';
}

export class ResetPasswordDto {
  @IsString()
  @MinLength(10)
  token: string = '';

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @MaxLength(128)
  password: string = '';
}
