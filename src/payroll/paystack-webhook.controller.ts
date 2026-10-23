import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PaystackService } from '../payments/paystack.service';
import { WalletService } from '../wallet/wallet.service';
import { PayrollService } from './payroll.service';

interface PaystackWebhookPayload {
  event: string;
  data?: {
    reference?: string;
    paid_at?: string;
    status?: string;
    gateway_response?: string;
    [key: string]: unknown;
  };
}

/** Single endpoint for all Paystack events (funding charges and payouts). */
@ApiExcludeController()
@Controller('payments/paystack')
export class PaystackWebhookController {
  constructor(
    private readonly paystack: PaystackService,
    private readonly walletService: WalletService,
    private readonly payrollService: PayrollService,
  ) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
    @Body() body: PaystackWebhookPayload,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody || !this.paystack.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const event = body?.event;
    const reference = body.data?.reference;
    if (!reference) {
      return { received: true };
    }

    if (event === 'charge.success') {
      // Wallet funding confirmed.
      await this.walletService.confirmFunding(reference, {
        paystackEvent: event,
        paidAt: body.data?.paid_at,
      });
    } else if (event === 'transfer.success') {
      await this.payrollService.markTransferResult(reference, true, {
        paystackEvent: event,
      });
    } else if (event === 'transfer.failed' || event === 'transfer.reversed') {
      await this.payrollService.markTransferResult(reference, false, {
        paystackEvent: event,
        reason: body.data?.gateway_response ?? body.data?.status,
      });
    }

    return { received: true };
  }
}
