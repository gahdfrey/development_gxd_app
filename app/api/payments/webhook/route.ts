import { NextRequest, NextResponse } from "next/server";
import { getPaymentGateway } from "@/lib/payments";
import { applyPaymentByReference } from "@/lib/payments/apply";

/**
 * Public endpoint the payment gateway calls directly (no session — this is
 * server-to-server). Authenticity comes from the signature check, not a
 * login. This is the authoritative confirmation path; app/api/payments/verify
 * is only a faster UI-feedback shortcut for when the patient is still on
 * the page.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const gateway = getPaymentGateway();

    const signature = request.headers.get("x-paystack-signature");
    if (!gateway.verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const reference: string | undefined = event?.data?.reference;

    if (event?.event === "charge.success" && reference) {
      await applyPaymentByReference(reference);
    }

    // Always 200 a recognized webhook call — even if the event type isn't
    // one we act on — so the gateway doesn't keep retrying it.
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Error handling payment webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
