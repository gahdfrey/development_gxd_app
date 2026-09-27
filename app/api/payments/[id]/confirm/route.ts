import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { applyBankTransferPayment } from "@/lib/payments/apply";

/**
 * Finance officer confirms a pending bank_transfer payment was actually
 * received. Settles it the same way a gateway webhook would — marks the
 * covered bill items paid, or credits the wallet for a top-up.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["finance", "edit"], ["finance", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId } = authz.ctx;

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
    }

    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, id), eq(payments.organisationId, orgId)))
      .limit(1);

    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.method !== "bank_transfer") {
      return NextResponse.json({ error: "Only bank transfer payments need manual confirmation" }, { status: 400 });
    }
    if (payment.status !== "pending") {
      return NextResponse.json({ error: "This payment has already been settled" }, { status: 409 });
    }

    const result = await applyBankTransferPayment(id, actorId);

    if (result.outcome === "applied") {
      return NextResponse.json({ status: "success" });
    }
    if (result.outcome === "already-applied") {
      return NextResponse.json({ status: "success" });
    }
    return NextResponse.json({ error: result.outcome }, { status: 409 });
  } catch (error) {
    console.error("Error confirming bank transfer payment:", error);
    return NextResponse.json({ error: "Failed to confirm payment" }, { status: 500 });
  }
}
