import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaystackService } from './paystack.service';
import { PAYMENT_GATEWAY } from './payment-gateway.interface';

@Module({
  imports: [HttpModule],
  providers: [
    PaystackService,
    { provide: PAYMENT_GATEWAY, useExisting: PaystackService },
  ],
  exports: [PaystackService, PAYMENT_GATEWAY],
})
export class PaymentsModule {}
