import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { patients, requests, prescriptions, labTests, products, payments, paymentItems } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { getPaymentGateway } from "@/lib/payments";

interface RequestedItem {
  itemType: "request" | "prescription";
  itemId: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = (session.user as any).patientId;
    if (!patientId || typeof patientId !== "number") {
      return NextResponse.json(
        { error: "No patient profile linked to this account" },
        { status: 403 },
      );
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
      .select({ id: patients.id, email: patients.email, organisationId: patients.organisationId })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    if (!patient.email) {
      return NextResponse.json({ error: "No email on file — required for online payment" }, { status: 400 });
    }

    const requestIds = items.filter((i) => i.itemType === "request").map((i) => i.itemId);
    const prescriptionIds = items.filter((i) => i.itemType === "prescription").map((i) => i.itemId);

    // Re-fetch every item from the DB — never trust a client-sent amount.
    // Ownership (patientId) and payment status are both re-verified here.
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
      return NextResponse.json(
        { error: "One or more items were not found on your account" },
        { status: 404 },
      );
    }

    const alreadyPaid = [...requestRows, ...prescriptionRows].some((r) => r.paymentStatus === "paid");
    if (alreadyPaid) {
      return NextResponse.json(
        { error: "One or more selected items have already been paid for" },
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
