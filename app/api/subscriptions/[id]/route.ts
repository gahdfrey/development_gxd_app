import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientSubscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/auth";
import { logAudit } from "@/lib/audit";

/** Cancel or pause/resume the logged-in patient's own subscription. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const patientId = (session.user as any).patientId;
    if (!patientId || typeof patientId !== "number") {
      return NextResponse.json({ error: "No patient profile linked to this account" }, { status: 403 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid subscription id" }, { status: 400 });

    const body = await request.json();
    const status = body.status;
    if (!["active", "paused", "cancelled"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updates: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status === "cancelled") updates.cancelledAt = new Date();

    const [updated] = await db
      .update(patientSubscriptions)
      .set(updates)
      .where(and(eq(patientSubscriptions.id, id), eq(patientSubscriptions.patientId, patientId)))
      .returning();

    if (!updated) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });

    void logAudit({
      organisationId: updated.organisationId,
      action: "update",
      entityType: "patient_subscription",
      entityId: id,
      details: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}
