export interface InitializeInput {
  reference: string;
  amountKobo: number;
  email: string;
  callbackUrl: string;
}

export interface InitializeResult {
  authorizationUrl: string;
}

export interface VerifyResult {
  success: boolean;
  amountKobo: number;
}

/**
 * A payment gateway is anything that can start a hosted-checkout
 * transaction, let us confirm it succeeded, and prove that a webhook call
 * actually came from the gateway (not a spoofed request). Keeping this
 * interface narrow is what lets the concrete provider (Paystack today) be
 * swapped for another (e.g. Flutterwave) without touching any of the
 * payment routes or the patient portal UI.
 */
export interface PaymentGateway {
  readonly provider: string;
  initialize(input: InitializeInput): Promise<InitializeResult>;
  verify(reference: string): Promise<VerifyResult>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
}
