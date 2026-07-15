import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Status changes come from schedulers and from clinicians working their
    // own appointment list.
    const authz = await requirePermission([
      ["appointments", "edit"],
      ["all-appointments", "edit"],
      ["my-appointments", "edit"],
      ["my-appointments", "view"],
    ]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const validStatuses = ["scheduled", "completed", "cancelled", "no-show"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const updatedAppointment = await db
      .update(appointments)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(appointments.id, parseInt(id)), eq(appointments.organisationId, orgId)))
      .returning();

    if (updatedAppointment.length === 0) {
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "appointment",
      entityId: parseInt(id),
      details: { status },
    });

    return NextResponse.json(updatedAppointment[0]);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
  }
}
