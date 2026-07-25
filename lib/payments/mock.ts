import type { InitializeInput, InitializeResult, PaymentGateway, VerifyResult } from "./gateway";

/**
 * A gateway that never talks to the network — every initialize/verify call
 * succeeds immediately. Used when no real gateway is configured
 * (PAYMENT_GATEWAY unset or "mock"), so the whole payment flow can be built
 * and tested end-to-end without a Paystack/Flutterwave account.
 */
export class MockGateway implements PaymentGateway {
  readonly provider = "mock";

  async initialize(input: InitializeInput): Promise<InitializeResult> {
    // No real checkout page exists; the frontend detects the mock provider
    // and calls /api/payments/verify directly instead of redirecting here.
    return { authorizationUrl: `${input.callbackUrl}?reference=${input.reference}&mock=true` };
  }

  async verify(_reference: string): Promise<VerifyResult> {
    // No real amount was ever charged, so there's nothing to reconcile
    // against — applyPayment skips its amount-match check for this provider.
    return { success: true, amountKobo: 0 };
  }

  verifyWebhookSignature(): boolean {
    return true;
  }
}
