import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class ReorderPhotosDto {
  // Liste ordonnée des ids de photos : l'index devient la nouvelle position.
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  order: string[] = [];
}
