import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { patients, payments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { getPaymentGateway } from "@/lib/payments";
import { DUMMY_BANK_ACCOUNT } from "@/lib/payments/bank-account";

/**
 * Starts a wallet top-up. method "gateway" opens a Paystack (or mock)
 * checkout; method "bank_transfer" just records a pending payment and hands
 * back the dummy test account — a finance officer confirms receipt later
 * (PATCH /api/payments/:id/confirm), which credits the wallet.
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
    const amount = Number(body.amount);
    const method = body.method === "bank_transfer" ? "bank_transfer" : "gateway";

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter a valid top-up amount" }, { status: 400 });
    }

    const [patient] = await db
      .select({ id: patients.id, email: patients.email, organisationId: patients.organisationId })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const reference = `cv_wtu_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;

    if (method === "bank_transfer") {
      const [payment] = await db
        .insert(payments)
        .values({
          organisationId: patient.organisationId,
          patientId,
          amount,
          method: "bank_transfer",
          purpose: "wallet_topup",
          gatewayReference: reference,
        })
        .returning();

      return NextResponse.json(
        { paymentId: payment.id, reference, amount, method: "bank_transfer", bankAccount: DUMMY_BANK_ACCOUNT },
        { status: 201 },
      );
    }

    if (!patient.email) {
      return NextResponse.json({ error: "No email on file — required for online payment" }, { status: 400 });
    }

    const gateway = getPaymentGateway();
    const [payment] = await db
      .insert(payments)
      .values({
        organisationId: patient.organisationId,
        patientId,
        amount,
        method: "gateway",
        purpose: "wallet_topup",
        gatewayProvider: gateway.provider,
        gatewayReference: reference,
      })
      .returning();

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const { authorizationUrl } = await gateway.initialize({
      reference,
      amountKobo: amount * 100,
      email: patient.email,
      callbackUrl: `${appUrl}/payments/callback`,
    });

    return NextResponse.json(
      { paymentId: payment.id, reference, amount, provider: gateway.provider, method: "gateway", authorizationUrl },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error initializing wallet top-up:", error);
    return NextResponse.json({ error: "Failed to initialize wallet top-up" }, { status: 500 });
  }
}
