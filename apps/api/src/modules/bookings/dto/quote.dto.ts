import { IsUUID, IsDateString, Matches } from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class QuoteDto {
  @IsUUID()
  listingId: string = '';

  @IsDateString()
  date: string = '';

  @Matches(TIME_PATTERN, { message: 'startTime doit être au format HH:mm' })
  startTime: string = '';

  @Matches(TIME_PATTERN, { message: 'endTime doit être au format HH:mm' })
  endTime: string = '';
}

export class QuoteResponseDto {
  unitCount: number = 0;
  pricingUnit: string = 'HOUR';
  basePrice: string = '0';
  baseAmount: string = '0';
  cleaningFee: string = '0';
  serviceFee: string = '0';
  taxAmount: string = '0';
  totalAmount: string = '0';
  /** Caution (empreinte bancaire), non incluse dans totalAmount — null = aucune. */
  depositAmount: string | null = null;
}
