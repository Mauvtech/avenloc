import { IsUUID, IsDateString } from 'class-validator';

export class QuoteDto {
  @IsUUID()
  listingId: string = '';

  @IsDateString()
  startDate: string = '';

  @IsDateString()
  endDate: string = '';
}

export class QuoteResponseDto {
  unitCount: number = 0;
  pricingUnit: string = 'NIGHT';
  basePrice: string = '0';
  baseAmount: string = '0';
  cleaningFee: string = '0';
  serviceFee: string = '0';
  taxAmount: string = '0';
  totalAmount: string = '0';
}
