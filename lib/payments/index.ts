import type { PaymentGateway } from "./gateway";
import { MockGateway } from "./mock";
import { PaystackGateway } from "./paystack";

let cached: PaymentGateway | null = null;

/**
 * Selects the active payment gateway from PAYMENT_GATEWAY. Defaults to the
 * mock gateway so the payment flow works out of the box in dev/test
 * environments without a real Paystack account — set PAYMENT_GATEWAY=paystack
 * and PAYSTACK_SECRET_KEY to go live.
 */
export function getPaymentGateway(): PaymentGateway {
  if (cached) return cached;

  const provider = process.env.PAYMENT_GATEWAY?.trim().toLowerCase() || "mock";

  if (provider === "paystack") {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new Error("PAYSTACK_SECRET_KEY is required when PAYMENT_GATEWAY=paystack");
    }
    cached = new PaystackGateway(secretKey);
  } else {
    cached = new MockGateway();
  }

  return cached;
}

export type { PaymentGateway } from "./gateway";
