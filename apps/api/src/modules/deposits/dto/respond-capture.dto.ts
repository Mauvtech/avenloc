import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class RespondCaptureDto {
  @IsIn(['accept', 'contest'])
  decision: 'accept' | 'contest' = 'accept';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  contestReason?: string;
}
