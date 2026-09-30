import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { billingPlans } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["billing", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });

    const body = await request.json();
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
    if (typeof body.description === "string") updates.description = body.description.trim() || null;
    if (body.amount !== undefined) {
      const amountNum = Number(body.amount);
      if (!Number.isFinite(amountNum) || amountNum <= 0) {
        return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
      }
      updates.amount = amountNum;
    }
    if (["weekly", "monthly", "yearly"].includes(body.billingInterval)) updates.billingInterval = body.billingInterval;
    if (typeof body.isActive === "boolean") updates.isActive = body.isActive;

    const [updated] = await db
      .update(billingPlans)
      .set(updates)
      .where(and(eq(billingPlans.id, id), eq(billingPlans.organisationId, orgId)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Billing plan not found" }, { status: 404 });

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "billing_plan",
      entityId: id,
      details: updates,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating billing plan:", error);
    return NextResponse.json({ error: "Failed to update billing plan" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["billing", "delete"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid plan id" }, { status: 400 });

    const [updated] = await db
      .update(billingPlans)
      .set({ deletedAt: new Date(), isActive: false, updatedAt: new Date() })
      .where(and(eq(billingPlans.id, id), eq(billingPlans.organisationId, orgId)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Billing plan not found" }, { status: 404 });

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "billing_plan",
      entityId: id,
      details: { name: updated.name },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting billing plan:", error);
    return NextResponse.json({ error: "Failed to delete billing plan" }, { status: 500 });
  }
}
