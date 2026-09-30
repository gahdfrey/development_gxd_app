import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { patients, requests, prescriptions, labTests, products, payments, paymentItems } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { DUMMY_BANK_ACCOUNT } from "@/lib/payments/bank-account";
import { findInFlightPaymentConflicts } from "@/lib/payments/guard";

interface RequestedItem {
  itemType: "request" | "prescription";
  itemId: number;
}

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
    const items: RequestedItem[] = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "Select at least one item to pay for" }, { status: 400 });
    }
    if (items.some((i) => !i.itemType || !["request", "prescription"].includes(i.itemType) || !Number.isFinite(i.itemId))) {
      return NextResponse.json({ error: "Invalid item selection" }, { status: 400 });
    }

    const [patient] = await db
      .select({ id: patients.id, organisationId: patients.organisationId })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const requestIds = items.filter((i) => i.itemType === "request").map((i) => i.itemId);
    const prescriptionIds = items.filter((i) => i.itemType === "prescription").map((i) => i.itemId);

    const requestRows = requestIds.length > 0
      ? await db
          .select({ id: requests.id, price: labTests.price, paymentStatus: requests.paymentStatus })
          .from(requests)
          .leftJoin(labTests, eq(requests.testId, labTests.id))
          .where(and(inArray(requests.id, requestIds), eq(requests.patientId, patientId)))
      : [];

    const prescriptionRows = prescriptionIds.length > 0
      ? await db
          .select({ id: prescriptions.id, price: products.price, paymentStatus: prescriptions.paymentStatus })
          .from(prescriptions)
          .leftJoin(products, eq(prescriptions.productId, products.id))
          .where(and(inArray(prescriptions.id, prescriptionIds), eq(prescriptions.patientId, patientId)))
      : [];

    if (requestRows.length !== requestIds.length || prescriptionRows.length !== prescriptionIds.length) {
      return NextResponse.json({ error: "One or more items were not found on your account" }, { status: 404 });
    }

    const alreadyPaid = [...requestRows, ...prescriptionRows].some((r) => r.paymentStatus === "paid");
    if (alreadyPaid) {
      return NextResponse.json({ error: "One or more selected items have already been paid for" }, { status: 409 });
    }

    const conflicts = await findInFlightPaymentConflicts(items);
    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: "One or more selected items already have a payment in progress — try again shortly, or check Pending Payment for its status" },
        { status: 409 },
      );
    }

    const itemsForPayment = [
      ...requestRows.map((r) => ({ itemType: "request" as const, itemId: r.id, amount: r.price ?? 0 })),
      ...prescriptionRows.map((r) => ({ itemType: "prescription" as const, itemId: r.id, amount: r.price ?? 0 })),
    ];

    const totalAmount = itemsForPayment.reduce((sum, i) => sum + i.amount, 0);
    if (totalAmount <= 0) {
      return NextResponse.json({ error: "Nothing payable was found for the selected items" }, { status: 400 });
    }

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
