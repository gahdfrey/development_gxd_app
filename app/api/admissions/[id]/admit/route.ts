import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admissions, beds } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { admissionQuery } from "@/lib/admissions";

/**
 * Accept a doctor's admission request by allocating a ward and bed. This is
 * the desk's half of the flow — it flips a "requested" row to "admitted" and
 * marks the bed occupied, exactly like a direct admission would.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["admission", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid admission ID" }, { status: 400 });

    const body = await request.json();
    const { wardId, bedId, admittingDoctorId } = body;

    if (!wardId || !bedId) {
      return NextResponse.json({ error: "Ward and bed are required" }, { status: 400 });
    }

    const parsedWardId = parseInt(wardId);
    const parsedBedId = parseInt(bedId);
    const parsedDoctorId = admittingDoctorId ? parseInt(admittingDoctorId) : null;
    if (isNaN(parsedWardId) || isNaN(parsedBedId) || (admittingDoctorId && isNaN(parsedDoctorId!))) {
      return NextResponse.json({ error: "Invalid ward, bed, or doctor reference" }, { status: 400 });
    }

    try {
      await db.transaction(async (tx) => {
        const [admission] = await tx
          .select({ id: admissions.id, status: admissions.status })
          .from(admissions)
          .where(and(eq(admissions.id, id), eq(admissions.organisationId, orgId)))
          .limit(1);

        if (!admission) throw new Error("NOT_FOUND");
        if (admission.status !== "requested") throw new Error("NOT_REQUESTED");

        const [bed] = await tx
          .select({ id: beds.id, status: beds.status, wardId: beds.wardId })
          .from(beds)
          .where(and(eq(beds.id, parsedBedId), eq(beds.organisationId, orgId)))
          .limit(1);

        if (!bed) throw new Error("BED_NOT_FOUND");
        if (bed.wardId !== parsedWardId) throw new Error("BED_WARD_MISMATCH");
        if (bed.status !== "available") throw new Error("BED_UNAVAILABLE");

        await tx
          .update(admissions)
          .set({
            wardId: parsedWardId,
            bedId: parsedBedId,
            // The desk may hand the patient to a different admitting doctor
            // (e.g. the ward consultant); otherwise the requester stands.
            ...(parsedDoctorId ? { admittingDoctorId: parsedDoctorId } : {}),
            status: "admitted",
            admittedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(admissions.id, id));

        await tx.update(beds).set({ status: "occupied", updatedAt: new Date() }).where(eq(beds.id, parsedBedId));
      });
    } catch (txError: any) {
      if (txError.message === "NOT_FOUND") return NextResponse.json({ error: "Admission request not found" }, { status: 404 });
      if (txError.message === "NOT_REQUESTED") return NextResponse.json({ error: "This request has already been actioned" }, { status: 409 });
      if (txError.message === "BED_NOT_FOUND") return NextResponse.json({ error: "Bed not found" }, { status: 404 });
      if (txError.message === "BED_WARD_MISMATCH") return NextResponse.json({ error: "Bed does not belong to the selected ward" }, { status: 400 });
      if (txError.message === "BED_UNAVAILABLE") return NextResponse.json({ error: "This bed is not available. Please choose a different bed." }, { status: 409 });
      throw txError;
    }

    const [record] = await admissionQuery().where(eq(admissions.id, id));

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "admit",
      entityType: "admission",
      entityId: id,
      details: { wardId: parsedWardId, bedId: parsedBedId, fromRequest: true },
    });

    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    console.error("Error admitting from request:", error);
    return NextResponse.json({ error: "Failed to admit patient" }, { status: 500 });
  }
}
