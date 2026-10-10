import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/authz";
import { hasAnyPermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

// PUT { optOut } — record the patient's choice to stop (or resume) SMS.
// Staff with Patients edit, or the patient themself via the portal.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const ctx = authz.ctx;
    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
    const isOwn = ctx.patientId === id;
    if (!isOwn && !hasAnyPermission(ctx, [["dashboard", "edit"], ["patients", "edit"]])) {
      return NextResponse.json({ error: "You don't have permission to change this" }, { status: 403 });
    }
    const { optOut } = await request.json();
    const [row] = await db
      .update(patients)
      .set({ messagingOptOut: optOut === true, messagingOptOutAt: optOut === true ? new Date() : null, updatedAt: new Date() })
      .where(and(eq(patients.id, id), eq(patients.organisationId, ctx.orgId), isNull(patients.deletedAt)))
      .returning({ id: patients.id });
    if (!row) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    void logAudit({ organisationId: ctx.orgId, userId: ctx.userId, userEmail: ctx.userEmail, action: optOut ? "sms.opt_out" : "sms.opt_in", entityType: "patient", entityId: id, details: { selfService: isOwn } });
    return NextResponse.json({ messagingOptOut: optOut === true });
  } catch (error) {
    console.error("Error updating SMS preference:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
