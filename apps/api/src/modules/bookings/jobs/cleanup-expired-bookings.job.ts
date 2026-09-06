import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class CleanupExpiredBookingsJob {
  private readonly logger = new Logger(CleanupExpiredBookingsJob.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron('*/15 * * * *')
  async cancelExpiredPendingBookings(): Promise<void> {
    const result = await this.prisma.booking.updateMany({
      where: {
        status: 'PENDING',
        hostApprovalDeadline: { lt: new Date() },
      },
      data: { status: 'CANCELLED' },
    });

    if (result.count > 0) {
      this.logger.log(
        `Cleaned up ${result.count} expired pending booking(s)`,
      );
    }
    // Note: Stripe PaymentIntent cancellation is handled by the payments module
    // when it detects CANCELLED bookings with active payment intents.
  }
}
