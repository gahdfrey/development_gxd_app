import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requests, prescriptions, patientCharges } from "@/lib/db/schema";
import { and, eq, isNull, ne } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { priceBillItems, itemKey } from "@/lib/billing/pricing";
import { getItemAuthorizations } from "@/lib/billing/authorizations";

// GET /api/hmo-authorizations/candidates?patientId= — the patient's unpaid,
// HMO-covered services that have no open or approved authorization yet
// (what the "New authorization request" form offers to include).
export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission([["finance", "view"]]);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const patientId = Number(new URL(request.url).searchParams.get("patientId"));
    if (!Number.isInteger(patientId)) return NextResponse.json({ error: "patientId is required" }, { status: 400 });

    const [reqRows, rxRows, chRows] = await Promise.all([
      db.select({ id: requests.id }).from(requests).where(and(
        eq(requests.organisationId, orgId), eq(requests.patientId, patientId), eq(requests.paymentStatus, "not_paid"),
      )),
      db.select({ id: prescriptions.id }).from(prescriptions).where(and(
        eq(prescriptions.organisationId, orgId), eq(prescriptions.patientId, patientId),
        eq(prescriptions.paymentStatus, "not_paid"), ne(prescriptions.status, "cancelled"),
      )),
      db.select({ id: patientCharges.id }).from(patientCharges).where(and(
        eq(patientCharges.organisationId, orgId), eq(patientCharges.patientId, patientId),
        eq(patientCharges.paymentStatus, "not_paid"), isNull(patientCharges.deletedAt),
      )),
    ]);

    const priced = await priceBillItems(orgId, [
      ...reqRows.map((r) => ({ itemType: "request" as const, itemId: r.id })),
      ...rxRows.map((r) => ({ itemType: "prescription" as const, itemId: r.id })),
      ...chRows.map((r) => ({ itemType: "charge" as const, itemId: r.id })),
    ]);
    // Declined items can be re-requested (they bill self-pay meanwhile).
    const covered = [...priced.values()].filter((p) => p.basis === "covered" || p.basis === "auth_declined");
    const auths = await getItemAuthorizations(db, orgId, covered);

    return NextResponse.json(
      {
        hmoName: covered[0]?.hmoName ?? null,
        items: covered
          .filter((p) => {
            const a = auths.get(itemKey(p.itemType, p.itemId));
            return !a || a.status === "denied";
          })
          .map((p) => ({
            itemType: p.itemType,
            itemId: p.itemId,
            description: p.description,
            price: p.tariffPrice ?? p.price,
            requiresAuthorization: p.requiresAuthorization,
            previouslyDeclined: p.basis === "auth_declined",
          })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching authorization candidates:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}
