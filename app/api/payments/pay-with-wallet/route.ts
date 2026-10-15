import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { patients, payments, paymentItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getOrCreateWallet, debitWallet, InsufficientBalanceError } from "@/lib/wallet";
import { logAudit } from "@/lib/audit";
import { parsePortalItems, resolvePortalBill, markBillItemsPaid } from "@/lib/payments/billItems";
import { settleHmoItems } from "@/lib/billing/settle";
import { notifyPaymentReceipt } from "@/lib/messaging/events";

/**
 * Pays for lab requests, prescriptions and vaccination doses instantly from the patient's wallet
 * balance — the wallet counterpart to /api/payments/initialize (gateway
 * checkout). Same server-side re-validation of items/prices/ownership; no
 * gateway round-trip since the funds are already in-house.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const patientId = session.user.patientId;
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

    const wallet = await getOrCreateWallet(patientId, patient.organisationId);

    const bill = await resolvePortalBill(patient.organisationId, patientId, items);
    if ("error" in bill) return NextResponse.json({ error: bill.error }, { status: bill.status });
    const { priced, itemsForPayment, totalAmount } = bill;
    if (wallet.balance < totalAmount) {
      return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 402 });
    }

    const reference = `cv_wpay_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    let paymentId: number;
    try {
      paymentId = await db.transaction(async (tx) => {
        const [payment] = await tx
          .insert(payments)
          .values({
            organisationId: patient.organisationId,
            patientId,
            amount: totalAmount,
            status: "success",
            method: "wallet",
            purpose: "bill",
            gatewayReference: reference,
          })
          .returning();

        await tx.insert(paymentItems).values(
          itemsForPayment.map((i) => ({
            paymentId: payment.id,
            itemType: i.itemType,
            itemId: i.itemId,
            amount: i.amount,
          })),
        );

        await debitWallet(tx, {
          walletId: wallet.id,
          patientId,
          organisationId: patient.organisationId,
          amount: totalAmount,
          source: "bill_payment",
          referenceType: "payment",
          referenceId: payment.id,
          description: "Bill payment from wallet",
        });

        await settleHmoItems(tx, patient.organisationId, [...priced.values()]);

        await markBillItemsPaid(tx, itemsForPayment);

        return payment.id;
      });
    } catch (err) {
      if (err instanceof InsufficientBalanceError) {
        return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 402 });
      }
      throw err;
    }

    for (const item of itemsForPayment) {
      void logAudit({
        organisationId: patient.organisationId,
        action: "update",
        entityType: item.itemType,
        entityId: item.itemId,
        details: { paymentStatus: "paid", method: "wallet", paymentId },
      });
    }

    await notifyPaymentReceipt(patient.organisationId, patientId, paymentId, totalAmount);

    return NextResponse.json({ paymentId, amount: totalAmount, status: "success" }, { status: 201 });
  } catch (error) {
    console.error("Error paying with wallet:", error);
    return NextResponse.json({ error: "Failed to pay with wallet" }, { status: 500 });
  }
}
