import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DepositsService } from './deposits.service';
import { DepositsController } from './deposits.controller';
import { DepositLifecycleJob } from './jobs/deposit-lifecycle.job';
import { StripeClient } from '@/modules/payments/stripe/stripe.client';
import { MessagingModule } from '@/modules/messaging/messaging.module';

@Module({
  imports: [MessagingModule, ScheduleModule],
  providers: [DepositsService, StripeClient, DepositLifecycleJob],
  controllers: [DepositsController],
  exports: [DepositsService],
})
export class DepositsModule {}
