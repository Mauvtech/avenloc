import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { PricingService } from './pricing.service';
import { CleanupExpiredBookingsJob } from './jobs/cleanup-expired-bookings.job';
import { MessagingModule } from '@/modules/messaging/messaging.module';

@Module({
  imports: [MessagingModule, ScheduleModule],
  providers: [BookingsService, PricingService, CleanupExpiredBookingsJob],
  controllers: [BookingsController],
  exports: [PricingService],
})
export class BookingsModule {}
