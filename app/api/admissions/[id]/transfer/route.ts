import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admissions, beds, admissionTransfers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["admission", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid admission ID" }, { status: 400 });

    const body = await request.json();
    const { toWardId, toBedId, reason } = body;

    if (!toWardId || !toBedId) {
      return NextResponse.json({ error: "Destination ward and bed are required" }, { status: 400 });
    }
    const parsedToWardId = parseInt(toWardId);
    const parsedToBedId = parseInt(toBedId);
    if (isNaN(parsedToWardId) || isNaN(parsedToBedId)) {
      return NextResponse.json({ error: "Invalid destination ward or bed" }, { status: 400 });
    }

    let result: any;
    try {
      result = await db.transaction(async (tx) => {
        const [admission] = await tx
          .select({ id: admissions.id, status: admissions.status, wardId: admissions.wardId, bedId: admissions.bedId })
          .from(admissions)
          .where(and(eq(admissions.id, id), eq(admissions.organisationId, orgId)));

        if (!admission) throw new Error("NOT_FOUND");
        if (admission.status !== "admitted") throw new Error("NOT_ADMITTED");
        if (admission.bedId === parsedToBedId) throw new Error("SAME_BED");

        const [targetBed] = await tx
          .select({ id: beds.id, status: beds.status, wardId: beds.wardId })
          .from(beds)
          .where(and(eq(beds.id, parsedToBedId), eq(beds.organisationId, orgId)));

        if (!targetBed) throw new Error("BED_NOT_FOUND");
        if (targetBed.wardId !== parsedToWardId) throw new Error("BED_WARD_MISMATCH");
        if (targetBed.status !== "available") throw new Error("BED_UNAVAILABLE");

        await tx.insert(admissionTransfers).values({
          organisationId: orgId,
          admissionId: id,
          fromWardId: admission.wardId,
          fromBedId: admission.bedId,
          toWardId: parsedToWardId,
          toBedId: parsedToBedId,
          reason: reason?.trim() || null,
          transferredBy: actorId,
        });

        await tx.update(beds).set({ status: "available", updatedAt: new Date() }).where(eq(beds.id, admission.bedId));
        await tx.update(beds).set({ status: "occupied", updatedAt: new Date() }).where(eq(beds.id, parsedToBedId));

        const [updatedAdmission] = await tx
          .update(admissions)
          .set({ wardId: parsedToWardId, bedId: parsedToBedId, updatedAt: new Date() })
          .where(eq(admissions.id, id))
          .returning();

        return updatedAdmission;
      });
    } catch (txError: any) {
      if (txError.message === "NOT_FOUND") return NextResponse.json({ error: "Admission not found" }, { status: 404 });
      if (txError.message === "NOT_ADMITTED") return NextResponse.json({ error: "This patient is not currently admitted" }, { status: 409 });
      if (txError.message === "SAME_BED") return NextResponse.json({ error: "Patient is already in this bed" }, { status: 400 });
      if (txError.message === "BED_NOT_FOUND") return NextResponse.json({ error: "Destination bed not found" }, { status: 404 });
      if (txError.message === "BED_WARD_MISMATCH") return NextResponse.json({ error: "Destination bed does not belong to the selected ward" }, { status: 400 });
      if (txError.message === "BED_UNAVAILABLE") return NextResponse.json({ error: "Destination bed is not available. Please choose a different bed." }, { status: 409 });
      throw txError;
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "transfer",
      entityType: "admission",
      entityId: id,
      details: { toWardId: parsedToWardId, toBedId: parsedToBedId, reason: reason?.trim() || null },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error transferring patient:", error);
    return NextResponse.json({ error: "Failed to transfer patient" }, { status: 500 });
  }
}
