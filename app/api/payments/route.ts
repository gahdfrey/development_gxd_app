import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { payments, patients } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";

/**
 * The finance officer's ledger view — every payment (bill, wallet top-up,
 * subscription charge; gateway, wallet, or bank transfer) for this org, most
 * recent first. This is the single source "completed funds" is read from
 * wherever it's rendered (finance page, dashboard revenue).
 */
export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission([["finance", "view"], ["finance", "edit"], ["finance", "add"]]);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const conditions = [eq(payments.organisationId, orgId)];
    if (status) conditions.push(eq(payments.status, status));

    const rows = await db
      .select({
        id: payments.id,
        patientId: payments.patientId,
        patientFirstname: patients.firstname,
        patientLastname: patients.lastname,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        method: payments.method,
        purpose: payments.purpose,
        gatewayProvider: payments.gatewayProvider,
        gatewayReference: payments.gatewayReference,
        initiatedBy: payments.initiatedBy,
        confirmedBy: payments.confirmedBy,
        createdAt: payments.createdAt,
        updatedAt: payments.updatedAt,
      })
      .from(payments)
      .leftJoin(patients, eq(payments.patientId, patients.id))
      .where(and(...conditions))
      .orderBy(desc(payments.createdAt))
      .limit(200);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}
