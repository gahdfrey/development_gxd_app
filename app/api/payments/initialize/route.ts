import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { patients, payments, paymentItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getPaymentGateway } from "@/lib/payments";
import { parsePortalItems, resolvePortalBill } from "@/lib/payments/billItems";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = session.user.patientId;
    if (!patientId || typeof patientId !== "number") {
      return NextResponse.json(
        { error: "No patient profile linked to this account" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const items = parsePortalItems(body);
    if (!items) {
      return NextResponse.json({ error: "Select at least one item to pay for" }, { status: 400 });
    }

    const [patient] = await db
      .select({ id: patients.id, email: patients.email, organisationId: patients.organisationId })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    if (!patient.email) {
      return NextResponse.json({ error: "No email on file — required for online payment" }, { status: 400 });
    }

    const bill = await resolvePortalBill(patient.organisationId, patientId, items);
    if ("error" in bill) return NextResponse.json({ error: bill.error }, { status: bill.status });
    const { itemsForPayment, totalAmount } = bill;

    const reference = `cv_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const gateway = getPaymentGateway();

    const [payment] = await db
      .insert(payments)
      .values({
        organisationId: patient.organisationId,
        patientId,
        amount: totalAmount,
        gatewayProvider: gateway.provider,
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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const { authorizationUrl } = await gateway.initialize({
      reference,
      amountKobo: totalAmount * 100,
      email: patient.email,
      callbackUrl: `${appUrl}/payments/callback`,
    });

    return NextResponse.json(
      { paymentId: payment.id, reference, amount: totalAmount, provider: gateway.provider, authorizationUrl },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error initializing payment:", error);
    return NextResponse.json({ error: "Failed to initialize payment" }, { status: 500 });
  }
}
