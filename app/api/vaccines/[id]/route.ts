import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vaccines } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { validateVaccine } from "@/lib/vaccination";

type Params = { params: Promise<{ id: string }> };

// PUT — edit a vaccine. A new price applies to doses booked from now on;
// doses already booked keep the price they were billed at.
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const v = validateVaccine(await request.json());
    if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
    const [row] = await db
      .update(vaccines)
      .set({ ...v.value, updatedAt: new Date() })
      .where(and(eq(vaccines.id, parseInt((await params).id)), eq(vaccines.organisationId, orgId), isNull(vaccines.deletedAt)))
      .returning();
    if (!row) return NextResponse.json({ error: "Vaccine not found" }, { status: 404 });
    void logAudit({ organisationId: orgId, userId, userEmail, action: "update", entityType: "vaccine", entityId: row.id, details: v.value });
    return NextResponse.json(row);
  } catch (error) {
    console.error("Error updating vaccine:", error);
    return NextResponse.json({ error: "Failed to update vaccine" }, { status: 500 });
  }
}

// DELETE — retire a vaccine (soft delete; existing courses and bills keep it).
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["setup", "delete"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const [row] = await db
      .update(vaccines)
      .set({ deletedAt: new Date() })
      .where(and(eq(vaccines.id, parseInt((await params).id)), eq(vaccines.organisationId, orgId), isNull(vaccines.deletedAt)))
      .returning({ id: vaccines.id, name: vaccines.name });
    if (!row) return NextResponse.json({ error: "Vaccine not found" }, { status: 404 });
    void logAudit({ organisationId: orgId, userId, userEmail, action: "delete", entityType: "vaccine", entityId: row.id, details: { name: row.name } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vaccine:", error);
    return NextResponse.json({ error: "Failed to remove vaccine" }, { status: 500 });
  }
}
