import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serviceItems } from "@/lib/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { validateServiceItem } from "@/lib/billing/serviceItems";

// GET /api/service-items?active=1 — the hospital's chargeable services.
export async function GET(request: NextRequest) {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const activeOnly = new URL(request.url).searchParams.get("active") === "1";
    const rows = await db
      .select()
      .from(serviceItems)
      .where(and(eq(serviceItems.organisationId, authz.ctx.orgId), isNull(serviceItems.deletedAt), ...(activeOnly ? [eq(serviceItems.isActive, true)] : [])))
      .orderBy(asc(serviceItems.category), asc(serviceItems.name));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching service items:", error);
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["setup", "add"], ["setup", "edit"], ["finance", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const v = validateServiceItem(await request.json());
    if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
    const [row] = await db.insert(serviceItems).values({ ...v.value, organisationId: orgId }).returning();
    void logAudit({ organisationId: orgId, userId, userEmail, action: "create", entityType: "service_item", entityId: row.id, details: v.value });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    console.error("Error creating service item:", error);
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
