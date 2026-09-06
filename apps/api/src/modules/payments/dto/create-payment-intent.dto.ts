import { IsUUID } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsUUID()
  bookingId: string = '';
}
