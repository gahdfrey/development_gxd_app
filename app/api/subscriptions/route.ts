import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientSubscriptions, billingPlans, patients } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { nextChargeDateFrom } from "@/lib/subscriptions";
import { logAudit } from "@/lib/audit";

/** The logged-in patient's own subscriptions, with plan details joined in. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const patientId = (session.user as any).patientId;
    if (!patientId || typeof patientId !== "number") {
      return NextResponse.json({ error: "No patient profile linked to this account" }, { status: 403 });
    }

    const rows = await db
      .select({
        id: patientSubscriptions.id,
        status: patientSubscriptions.status,
        startDate: patientSubscriptions.startDate,
        nextChargeDate: patientSubscriptions.nextChargeDate,
        lastChargedAt: patientSubscriptions.lastChargedAt,
        cancelledAt: patientSubscriptions.cancelledAt,
        planId: billingPlans.id,
        planName: billingPlans.name,
        planAmount: billingPlans.amount,
        planInterval: billingPlans.billingInterval,
      })
      .from(patientSubscriptions)
      .innerJoin(billingPlans, eq(patientSubscriptions.billingPlanId, billingPlans.id))
      .where(eq(patientSubscriptions.patientId, patientId));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
  }
}

/** Subscribe the logged-in patient to a billing plan. */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const patientId = (session.user as any).patientId;
    if (!patientId || typeof patientId !== "number") {
      return NextResponse.json({ error: "No patient profile linked to this account" }, { status: 403 });
    }

    const body = await request.json();
    const billingPlanId = Number(body.billingPlanId);
    if (!Number.isFinite(billingPlanId)) {
      return NextResponse.json({ error: "Select a billing plan" }, { status: 400 });
    }

    const [patient] = await db
      .select({ id: patients.id, organisationId: patients.organisationId })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const [plan] = await db
      .select()
      .from(billingPlans)
      .where(and(eq(billingPlans.id, billingPlanId), eq(billingPlans.organisationId, patient.organisationId), eq(billingPlans.isActive, true)))
      .limit(1);
    if (!plan) return NextResponse.json({ error: "Billing plan not found" }, { status: 404 });

    const [existing] = await db
      .select({ id: patientSubscriptions.id })
      .from(patientSubscriptions)
      .where(and(
        eq(patientSubscriptions.patientId, patientId),
        eq(patientSubscriptions.billingPlanId, billingPlanId),
        eq(patientSubscriptions.status, "active"),
      ))
      .limit(1);
    if (existing) return NextResponse.json({ error: "Already subscribed to this plan" }, { status: 409 });

    const now = new Date();
    const [subscription] = await db
      .insert(patientSubscriptions)
      .values({
        organisationId: patient.organisationId,
        patientId,
        billingPlanId,
        startDate: now,
        nextChargeDate: nextChargeDateFrom(now, plan.billingInterval),
      })
      .returning();

    void logAudit({
      organisationId: patient.organisationId,
      action: "create",
      entityType: "patient_subscription",
      entityId: subscription.id,
      details: { planName: plan.name, patientId },
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 });
  }
}
