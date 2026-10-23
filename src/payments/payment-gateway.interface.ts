export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';

export interface InitializeFundingParams {
  email: string;
  amount: number; // minor units (kobo)
  reference: string;
  metadata?: Record<string, any>;
}

export interface InitializeFundingResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface VerifyTransactionResult {
  status: string; // 'success' | 'failed' | ...
  amount: number;
  reference: string;
  raw: Record<string, any>;
}

export interface CreateTransferRecipientParams {
  name: string;
  accountNumber: string;
  bankCode: string;
  currency?: string;
}

export interface CreateTransferRecipientResult {
  recipientCode: string;
  raw: Record<string, any>;
}

export interface InitiateTransferParams {
  amount: number; // minor units (kobo)
  recipientCode: string;
  reference: string;
  reason?: string;
}

export interface InitiateTransferResult {
  transferCode: string;
  status: string;
  reference: string;
  raw: Record<string, any>;
}

/**
 * Abstraction over a payment provider so additional gateways can be added
 * later. Paystack is the first implementation.
 */
export interface PaymentGateway {
  initializeFunding(
    params: InitializeFundingParams,
  ): Promise<InitializeFundingResult>;

  verifyTransaction(reference: string): Promise<VerifyTransactionResult>;

  // Used by the payout engine in a later phase.
  createTransferRecipient(
    params: CreateTransferRecipientParams,
  ): Promise<CreateTransferRecipientResult>;

  initiateTransfer(
    params: InitiateTransferParams,
  ): Promise<InitiateTransferResult>;
}
