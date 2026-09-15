import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { ListingsService } from './listings.service';
import { ListingsController } from './listings.controller';

@Module({
  imports: [AuthModule],
  providers: [ListingsService],
  controllers: [ListingsController],
  exports: [ListingsService],
})
export class ListingsModule {}
