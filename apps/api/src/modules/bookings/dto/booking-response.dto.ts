import type { BookingStatus } from '@prisma/client';

export class BookingResponseDto {
  id: string;
  listingId: string;
  tenantId: string;
  status: BookingStatus;
  startDate: Date;
  endDate: Date;
  unitCount: number;
  guestCount: number;
  guestNote?: string | null;
  baseAmount: string;
  cleaningFee: string;
  serviceFee: string;
  taxAmount: string;
  totalAmount: string;
  hostApprovalDeadline?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
