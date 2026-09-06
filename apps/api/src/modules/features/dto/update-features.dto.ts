import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateFeaturesDto {
  @IsOptional()
  @IsBoolean()
  simulatePayments?: boolean;
}
