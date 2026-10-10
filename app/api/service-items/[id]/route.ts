import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceItems } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { validateServiceItem } from "@/lib/billing/serviceItems";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["setup", "edit"], ["finance", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const v = validateServiceItem(await request.json());
    if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
    const [row] = await db
      .update(serviceItems)
      .set({ ...v.value, updatedAt: new Date() })
      .where(and(eq(serviceItems.id, parseInt((await params).id)), eq(serviceItems.organisationId, orgId), isNull(serviceItems.deletedAt)))
      .returning();
    if (!row) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    void logAudit({ organisationId: orgId, userId, userEmail, action: "update", entityType: "service_item", entityId: row.id, details: v.value });
    return NextResponse.json(row);
  } catch (error) {
    console.error("Error updating service item:", error);
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}

// DELETE — retire a service (soft delete; existing charges keep their snapshot).
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["setup", "delete"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const [row] = await db
      .update(serviceItems)
      .set({ deletedAt: new Date() })
      .where(and(eq(serviceItems.id, parseInt((await params).id)), eq(serviceItems.organisationId, orgId), isNull(serviceItems.deletedAt)))
      .returning({ id: serviceItems.id, name: serviceItems.name });
    if (!row) return NextResponse.json({ error: "Service not found" }, { status: 404 });
    void logAudit({ organisationId: orgId, userId, userEmail, action: "delete", entityType: "service_item", entityId: row.id, details: { name: row.name } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service item:", error);
    return NextResponse.json({ error: "Failed to remove service" }, { status: 500 });
  }
}
