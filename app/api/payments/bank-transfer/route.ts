import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { patients, payments, paymentItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { DUMMY_BANK_ACCOUNT } from "@/lib/payments/bank-account";
import { parsePortalItems, resolvePortalBill } from "@/lib/payments/billItems";

/**
 * Records a bill payment as "pending bank transfer" and hands back the
 * dummy test account to display — same re-validation as /api/payments/
 * initialize, but no gateway call. A finance officer later confirms receipt
 * via PATCH /api/payments/:id/confirm, which marks the items paid.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const patientId = (session.user as any).patientId;
    if (!patientId || typeof patientId !== "number") {
      return NextResponse.json({ error: "No patient profile linked to this account" }, { status: 403 });
    }

    const body = await request.json();
    const items = parsePortalItems(body);
    if (!items) {
      return NextResponse.json({ error: "Select at least one item to pay for" }, { status: 400 });
    }

    const [patient] = await db
      .select({ id: patients.id, organisationId: patients.organisationId })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const bill = await resolvePortalBill(patient.organisationId, patientId, items);
    if ("error" in bill) return NextResponse.json({ error: bill.error }, { status: bill.status });
    const { itemsForPayment, totalAmount } = bill;

    const reference = `cv_btr_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    const [payment] = await db
      .insert(payments)
      .values({
        organisationId: patient.organisationId,
        patientId,
        amount: totalAmount,
        method: "bank_transfer",
        purpose: "bill",
        gatewayReference: reference,
      })
      .returning();

    await db.insert(paymentItems).values(
      itemsForPayment.map((i) => ({
        paymentId: payment.id,
        itemType: i.itemType,
        itemId: i.itemId,
        amount: i.amount,
      })),
    );

    return NextResponse.json(
      { paymentId: payment.id, reference, amount: totalAmount, method: "bank_transfer", bankAccount: DUMMY_BANK_ACCOUNT },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error recording bank transfer payment:", error);
    return NextResponse.json({ error: "Failed to record bank transfer payment" }, { status: 500 });
  }
}
