import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

export class CreateFaqItemDto {
  @IsString()
  @MaxLength(300)
  question: string = '';

  @IsString()
  @MaxLength(2000)
  answer: string = '';

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}

export class UpdateFaqItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  question?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  answer?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
