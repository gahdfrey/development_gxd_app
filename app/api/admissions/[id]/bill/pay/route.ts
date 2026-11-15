import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { admissions } from "@/lib/db/schema";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { recordAdmissionBillPayment, syncBedDayCharges } from "@/lib/billing/admissionBill";
import { parseAmount, prepareDeskPayment } from "@/lib/billing/shifts";
import { getOrCreateWallet } from "@/lib/wallet";
import { notifyPaymentReceipt } from "@/lib/messaging/events";

/**
 * POST /api/admissions/[id]/bill/pay — record money received at the finance
 * desk towards an admission bill.
 *   { amount, channel: "cash" | "pos" | "transfer", posReference? }
 * Open lines are paid off oldest-first; any remainder goes to the patient's
 * wallet as a deposit. Needs the cashier's open shift.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission([["finance", "edit"], ["finance", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid admission" }, { status: 400 });

    const body = await request.json();
    const amount = parseAmount(body.amount);
    if (amount == null || amount <= 0) {
      return NextResponse.json({ error: "Enter the amount received, in whole Naira" }, { status: 400 });
    }

    const [adm] = await db
      .select({ patientId: admissions.patientId, status: admissions.status })
      .from(admissions)
      .where(and(eq(admissions.id, id), eq(admissions.organisationId, orgId)))
      .limit(1);
    if (!adm || (adm.status !== "admitted" && adm.status !== "discharged")) {
      return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    }

    const prep = await prepareDeskPayment(orgId, userId, body, amount);
    if ("error" in prep) return NextResponse.json({ error: prep.error, code: prep.code }, { status: prep.status });
    if (!prep.desk) return NextResponse.json({ error: "Enter the amount received" }, { status: 400 });
    const desk = prep.desk;

    if (adm.status === "admitted") await syncBedDayCharges(db, orgId, id, userId);
    const wallet = await getOrCreateWallet(adm.patientId, orgId);
    const outcome = await db.transaction((tx) =>
      recordAdmissionBillPayment(tx, { orgId, admissionId: id, userId, amount, desk, walletId: wallet.id }),
    );
    if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status ?? 400 });

    await notifyPaymentReceipt(orgId, outcome.patientId, outcome.paymentId, outcome.amount);
    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "admission_bill.pay_desk",
      entityType: "admission",
      entityId: id,
      details: { ...outcome, channel: desk.channel },
    });
    return NextResponse.json(outcome);
  } catch (error) {
    console.error("Error recording admission bill payment:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
