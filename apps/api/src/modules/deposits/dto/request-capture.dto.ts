import { IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export const CAPTURE_REASONS = [
  'Dégradation',
  'No-show',
  'Retard',
  'Dépassement de créneau',
  'Autre',
] as const;

export class RequestCaptureDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  reason: string = '';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100_000)
  @Type(() => Number)
  amount: number = 0;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string = '';
}
