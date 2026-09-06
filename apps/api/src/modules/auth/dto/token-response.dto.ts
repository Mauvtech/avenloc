import { IsNotEmpty, IsString } from 'class-validator';

export class TokenResponseDto {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // durée de validité de l'access token en secondes

  constructor(data: TokenResponseDto) {
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.tokenType = 'Bearer';
    this.expiresIn = data.expiresIn;
  }
}

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string = '';
}

export class LogoutDto {
  @IsString()
  @IsNotEmpty()
  refreshToken: string = '';
}

export class ExchangeCodeDto {
  @IsString()
  @IsNotEmpty()
  code: string = '';
}
