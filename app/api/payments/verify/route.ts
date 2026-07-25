import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { applyPaymentByReference } from "@/lib/payments/apply";

/**
 * Called when the patient is returned from the gateway's checkout page —
 * fast UI feedback only. The webhook (app/api/payments/webhook) is the
 * authoritative confirmation; this just runs the same idempotent apply
 * logic a little earlier when possible.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const patientId = (session.user as any).patientId;
    if (!patientId || typeof patientId !== "number") {
      return NextResponse.json({ error: "No patient profile linked to this account" }, { status: 403 });
    }

    const reference = request.nextUrl.searchParams.get("reference");
    if (!reference) {
      return NextResponse.json({ error: "Missing reference" }, { status: 400 });
    }

    const [payment] = await db
      .select({ id: payments.id, patientId: payments.patientId, status: payments.status, amount: payments.amount })
      .from(payments)
      .where(eq(payments.gatewayReference, reference))
      .limit(1);

    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.patientId !== patientId) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status === "success") {
      return NextResponse.json({ status: "success", amount: payment.amount });
    }

    const result = await applyPaymentByReference(reference);

    if (result.outcome === "applied" || result.outcome === "already-applied") {
      return NextResponse.json({ status: "success", amount: payment.amount });
    }
    if (result.outcome === "verification-failed") {
      return NextResponse.json({ status: "failed" });
    }
    return NextResponse.json({ error: result.outcome }, { status: 409 });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json({ error: "Failed to verify payment" }, { status: 500 });
  }
}
