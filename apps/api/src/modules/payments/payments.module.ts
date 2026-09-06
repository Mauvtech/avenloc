import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { StripeClient } from './stripe/stripe.client';
import { MessagingModule } from '@/modules/messaging/messaging.module';

@Module({
  imports: [MessagingModule],
  providers: [PaymentsService, StripeClient],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
