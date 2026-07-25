import crypto from "crypto";
import type { InitializeInput, InitializeResult, PaymentGateway, VerifyResult } from "./gateway";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

/**
 * Paystack REST integration — the standard gateway for Nigerian healthtech.
 * Docs: https://paystack.com/docs/payments/accept-payments
 */
export class PaystackGateway implements PaymentGateway {
  readonly provider = "paystack";

  constructor(private readonly secretKey: string) {}

  async initialize(input: InitializeInput): Promise<InitializeResult> {
    const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reference: input.reference,
        amount: input.amountKobo,
        email: input.email,
        callback_url: input.callbackUrl,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      throw new Error(data.message || "Failed to initialize payment with Paystack");
    }

    return { authorizationUrl: data.data.authorization_url };
  }

  async verify(reference: string): Promise<VerifyResult> {
    const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${this.secretKey}` },
    });

    const data = await res.json();
    if (!res.ok || !data.status) {
      return { success: false, amountKobo: 0 };
    }

    return {
      success: data.data.status === "success",
      amountKobo: data.data.amount,
    };
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader) return false;
    const expected = crypto
      .createHmac("sha512", this.secretKey)
      .update(rawBody)
      .digest("hex");
    // Constant-time comparison to avoid a timing side-channel.
    const expectedBuf = Buffer.from(expected);
    const givenBuf = Buffer.from(signatureHeader);
    if (expectedBuf.length !== givenBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, givenBuf);
  }
}
