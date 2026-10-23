import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import {
  CreateTransferRecipientParams,
  CreateTransferRecipientResult,
  InitializeFundingParams,
  InitializeFundingResult,
  InitiateTransferParams,
  InitiateTransferResult,
  PaymentGateway,
  VerifyTransactionResult,
} from './payment-gateway.interface';

interface PaystackApiResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

interface InitializeTransactionData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

interface VerifyTransactionData {
  status: string;
  amount: number;
  reference: string;
  [key: string]: unknown;
}

interface TransferRecipientData {
  recipient_code: string;
  [key: string]: unknown;
}

interface TransferData {
  transfer_code: string;
  status: string;
  reference: string;
  [key: string]: unknown;
}

@Injectable()
export class PaystackService implements PaymentGateway {
  private readonly logger = new Logger(PaystackService.name);
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly secretKey: string;
  private readonly callbackUrl?: string;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.secretKey = config.get<string>('PAYSTACK_SECRET_KEY', '');
    this.callbackUrl = config.get<string>('PAYSTACK_CALLBACK_URL');
    if (!this.secretKey) {
      this.logger.warn(
        'PAYSTACK_SECRET_KEY is not set; Paystack calls will fail.',
      );
    }
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  async initializeFunding(
    params: InitializeFundingParams,
  ): Promise<InitializeFundingResult> {
    const { data } = await firstValueFrom(
      this.http.post<PaystackApiResponse<InitializeTransactionData>>(
        `${this.baseUrl}/transaction/initialize`,
        {
          email: params.email,
          amount: params.amount,
          reference: params.reference,
          metadata: params.metadata,
          callback_url: this.callbackUrl,
        },
        { headers: this.headers },
      ),
    );
    return {
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference: data.data.reference,
    };
  }

  async verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
    const { data } = await firstValueFrom(
      this.http.get<PaystackApiResponse<VerifyTransactionData>>(
        `${this.baseUrl}/transaction/verify/${reference}`,
        { headers: this.headers },
      ),
    );
    return {
      status: data.data.status,
      amount: data.data.amount,
      reference: data.data.reference,
      raw: data.data,
    };
  }

  /**
   * Verifies the `x-paystack-signature` header against the raw request body
   * using HMAC SHA512 with the secret key.
   */
  verifyWebhookSignature(rawBody: Buffer, signature?: string): boolean {
    if (!signature || !this.secretKey) {
      return false;
    }
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');
    return hash === signature;
  }

  async createTransferRecipient(
    params: CreateTransferRecipientParams,
  ): Promise<CreateTransferRecipientResult> {
    const { data } = await firstValueFrom(
      this.http.post<PaystackApiResponse<TransferRecipientData>>(
        `${this.baseUrl}/transferrecipient`,
        {
          type: 'nuban',
          name: params.name,
          account_number: params.accountNumber,
          bank_code: params.bankCode,
          currency: params.currency ?? 'NGN',
        },
        { headers: this.headers },
      ),
    );
    return { recipientCode: data.data.recipient_code, raw: data.data };
  }

  async initiateTransfer(
    params: InitiateTransferParams,
  ): Promise<InitiateTransferResult> {
    const { data } = await firstValueFrom(
      this.http.post<PaystackApiResponse<TransferData>>(
        `${this.baseUrl}/transfer`,
        {
          source: 'balance',
          amount: params.amount,
          recipient: params.recipientCode,
          reference: params.reference,
          reason: params.reason,
        },
        { headers: this.headers },
      ),
    );
    return {
      transferCode: data.data.transfer_code,
      status: data.data.status,
      reference: data.data.reference,
      raw: data.data,
    };
  }
}
