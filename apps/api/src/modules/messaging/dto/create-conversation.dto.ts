import { IsUUID, IsOptional } from 'class-validator';

export class CreateConversationDto {
  @IsUUID()
  listingId: string = '';

  @IsOptional()
  @IsUUID()
  bookingId?: string;
}
