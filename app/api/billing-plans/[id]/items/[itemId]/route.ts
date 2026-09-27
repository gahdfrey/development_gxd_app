import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { billingPlanItems } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  try {
    const authz = await requirePermission([["billing", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam, itemId: itemIdParam } = await params;
    const billingPlanId = parseInt(idParam);
    const rowId = parseInt(itemIdParam);
    if (!Number.isFinite(billingPlanId) || !Number.isFinite(rowId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(billingPlanItems)
      .where(and(
        eq(billingPlanItems.id, rowId),
        eq(billingPlanItems.billingPlanId, billingPlanId),
        eq(billingPlanItems.organisationId, orgId),
      ))
      .returning();

    if (!deleted) return NextResponse.json({ error: "Billing plan item not found" }, { status: 404 });

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "billing_plan_item",
      entityId: billingPlanId,
      details: { itemType: deleted.itemType, itemId: deleted.itemId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing billing plan item:", error);
    return NextResponse.json({ error: "Failed to remove billing plan item" }, { status: 500 });
  }
}
