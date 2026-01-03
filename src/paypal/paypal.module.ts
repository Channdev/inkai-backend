import { Module } from '@nestjs/common';
import { PaypalController, LegacyPaypalController } from './paypal.controller';
import { PaypalService } from './paypal.service';

@Module({
  controllers: [PaypalController, LegacyPaypalController],
  providers: [PaypalService],
  exports: [PaypalService],
})
export class PaypalModule {}
