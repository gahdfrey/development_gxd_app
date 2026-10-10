import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admissions, serviceItems, patientCharges } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { raiseAuthorizationsForOrders } from "@/lib/billing/authorizations";

// POST { serviceItemId, quantity?, notes? } — add a service to the admission bill.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission([["admission", "edit"], ["admission", "add"], ["finance", "edit"], ["finance", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const id = parseInt((await params).id);
    const [adm] = await db
      .select({ id: admissions.id, patientId: admissions.patientId, status: admissions.status })
      .from(admissions)
      .where(and(eq(admissions.id, id), eq(admissions.organisationId, orgId)))
      .limit(1);
    if (!adm) return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    if (adm.status !== "admitted" && adm.status !== "discharged") return NextResponse.json({ error: "Only admitted patients have a bill" }, { status: 400 });

    const body = await request.json();
    const quantity = body.quantity == null || body.quantity === "" ? 1 : Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 1000) return NextResponse.json({ error: "Quantity must be a whole number" }, { status: 400 });
    const [svc] = await db
      .select()
      .from(serviceItems)
      .where(and(eq(serviceItems.id, Number(body.serviceItemId)), eq(serviceItems.organisationId, orgId), isNull(serviceItems.deletedAt), eq(serviceItems.isActive, true)))
      .limit(1);
    if (!svc) return NextResponse.json({ error: "Choose a service" }, { status: 400 });

    const [row] = await db
      .insert(patientCharges)
      .values({
        organisationId: orgId,
        patientId: adm.patientId,
        admissionId: adm.id,
        sourceType: "service",
        serviceItemId: svc.id,
        chargeDate: new Date(Date.now() + 3_600_000).toISOString().slice(0, 10),
        description: svc.name,
        quantity,
        unitPrice: svc.price,
        taxCode: svc.taxCode,
        notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        createdBy: userId,
      })
      .returning();
    await raiseAuthorizationsForOrders(orgId, [{ itemType: "charge", itemId: row.id }], userId);
    void logAudit({ organisationId: orgId, userId, userEmail, action: "create", entityType: "patient_charge", entityId: row.id, details: { admissionId: adm.id, service: svc.name, quantity } });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("Error adding charge:", error);
    return NextResponse.json({ error: "Failed to add charge" }, { status: 500 });
  }
}
