import { IsUUID, IsEnum, IsInt, Min, Max, IsString, MaxLength, IsBoolean, IsOptional } from 'class-validator';
import { ReviewTarget } from '@prisma/client';

export class CreateReviewDto {
  @IsUUID()
  bookingId: string = '';

  @IsEnum(ReviewTarget)
  target: ReviewTarget = ReviewTarget.LISTING;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number = 5;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;

  /** Critères évalués, texte libre (ex. "Propreté, conformité, accès"). */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  criteria?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = true;
}
