import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { criticalAlerts } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { CLINICAL_EDIT } from "@/lib/clinical/access";

/**
 * PATCH /api/critical-alerts/[id]
 *   { action: "acknowledge", note } — a clinician confirms they received the
 *     critical result and records what they're doing about it. Any clinician
 *     may acknowledge (e.g. the covering doctor), not only the addressee.
 *   { action: "escalate", note } — the lab records who it phoned about an
 *     unacknowledged alert.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await request.json();
    const action = body.action as string;
    const note = typeof body.note === "string" ? body.note.trim() : "";

    const authz = await requirePermission(
      action === "escalate"
        ? [["laboratory", "add"], ["laboratory", "edit"], ["radiography", "add"], ["radiography", "edit"]]
        : CLINICAL_EDIT,
    );
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid alert ID" }, { status: 400 });
    if (!["acknowledge", "escalate"].includes(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    if (!note) {
      return NextResponse.json(
        { error: action === "acknowledge" ? "Note what you are doing about this result" : "Note who you contacted" },
        { status: 400 },
      );
    }

    const set = action === "acknowledge"
      ? { acknowledgedAt: new Date(), acknowledgedBy: userId, actionNote: note }
      : { escalatedAt: new Date(), escalationNote: note };
    const [updated] = await db
      .update(criticalAlerts)
      .set(set)
      .where(and(eq(criticalAlerts.id, id), eq(criticalAlerts.organisationId, orgId), isNull(criticalAlerts.acknowledgedAt)))
      .returning();
    if (!updated) return NextResponse.json({ error: "Alert not found or already acknowledged" }, { status: 404 });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: `critical_alert.${action}`,
      entityType: "critical_alert",
      entityId: id,
      details: { patientId: updated.patientId, requestId: updated.requestId, parameter: updated.parameterName, value: updated.value, note },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating critical alert:", error);
    return NextResponse.json({ error: "Failed to update alert" }, { status: 500 });
  }
}
