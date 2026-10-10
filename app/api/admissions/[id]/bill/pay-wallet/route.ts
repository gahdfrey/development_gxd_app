import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { payBillFromWallet, syncBedDayCharges } from "@/lib/billing/admissionBill";
import { notifyPaymentReceipt } from "@/lib/messaging/events";
import { InsufficientBalanceError } from "@/lib/wallet";

// POST — settle everything outstanding on the admission bill from the
// patient's wallet (deposit).
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission([["finance", "edit"], ["finance", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid admission" }, { status: 400 });
    await syncBedDayCharges(db, orgId, id, userId);
    let outcome;
    try {
      outcome = await db.transaction((tx) => payBillFromWallet(tx, { orgId, admissionId: id, userId }));
    } catch (err) {
      if (err instanceof InsufficientBalanceError) return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 402 });
      throw err;
    }
    if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status ?? 400 });
    await notifyPaymentReceipt(orgId, outcome.patientId, outcome.paymentId, outcome.amount);
    void logAudit({ organisationId: orgId, userId, userEmail, action: "admission_bill.pay_wallet", entityType: "admission", entityId: id, details: outcome });
    return NextResponse.json(outcome);
  } catch (error) {
    console.error("Error paying admission bill:", error);
    return NextResponse.json({ error: "Failed to pay bill" }, { status: 500 });
  }
}
