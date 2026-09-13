import type { DepositStatus } from '@prisma/client';

export class DepositResponseDto {
  id: string;
  bookingId: string;
  status: DepositStatus;
  amount: string;
  capturedAmount: string | null;
  captureReason: string | null;
  captureRequestedAt: Date | null;
  contestReason: string | null;
  contestedAt: Date | null;
  capturedAt: Date | null;
  releasedAt: Date | null;
  proofUrls: string[];
  createdAt: Date;
}
