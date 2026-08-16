import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admissions, wards, beds, users, admissionTransfers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { admissionQuery } from "@/lib/admissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["admission", "view"]]);
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid admission ID" }, { status: 400 });

    const [admission] = await admissionQuery()
      .where(and(eq(admissions.id, id), eq(admissions.organisationId, orgId)));

    if (!admission) return NextResponse.json({ error: "Admission not found" }, { status: 404 });

    const fromWard = alias(wards, "from_ward");
    const toWard = alias(wards, "to_ward");
    const fromBed = alias(beds, "from_bed");
    const toBed = alias(beds, "to_bed");

    const transfers = await db
      .select({
        id: admissionTransfers.id,
        reason: admissionTransfers.reason,
        transferredAt: admissionTransfers.transferredAt,
        fromWardName: fromWard.name,
        fromBedNumber: fromBed.bedNumber,
        toWardName: toWard.name,
        toBedNumber: toBed.bedNumber,
        transferredByFirstname: users.firstname,
        transferredByLastname: users.lastname,
      })
      .from(admissionTransfers)
      .leftJoin(fromWard, eq(admissionTransfers.fromWardId, fromWard.id))
      .leftJoin(toWard, eq(admissionTransfers.toWardId, toWard.id))
      .leftJoin(fromBed, eq(admissionTransfers.fromBedId, fromBed.id))
      .leftJoin(toBed, eq(admissionTransfers.toBedId, toBed.id))
      .leftJoin(users, eq(admissionTransfers.transferredBy, users.id))
      .where(eq(admissionTransfers.admissionId, id))
      .orderBy(desc(admissionTransfers.transferredAt));

    return NextResponse.json({ ...admission, transfers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching admission:", error);
    return NextResponse.json({ error: "Failed to fetch admission" }, { status: 500 });
  }
}

export async function PATCH(
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
    const { dischargeSummary } = body;

    if (!dischargeSummary?.trim()) {
      return NextResponse.json({ error: "Discharge summary is required" }, { status: 400 });
    }

    let result: any;
    try {
      result = await db.transaction(async (tx) => {
        const [admission] = await tx
          .select({ id: admissions.id, status: admissions.status, bedId: admissions.bedId })
          .from(admissions)
          .where(and(eq(admissions.id, id), eq(admissions.organisationId, orgId)));

        if (!admission) throw new Error("NOT_FOUND");
        if (admission.status !== "admitted") throw new Error("NOT_ADMITTED");
        // An "admitted" row always has a bed; this keeps the freeing step below
        // honest about it rather than assuming.
        if (!admission.bedId) throw new Error("NO_BED");

        const [updated] = await tx
          .update(admissions)
          .set({
            status: "discharged",
            dischargedAt: new Date(),
            dischargeSummary: dischargeSummary.trim(),
            dischargedBy: actorId,
            updatedAt: new Date(),
          })
          .where(eq(admissions.id, id))
          .returning();

        await tx.update(beds).set({ status: "available", updatedAt: new Date() }).where(eq(beds.id, admission.bedId));

        return updated;
      });
    } catch (txError: any) {
      if (txError.message === "NOT_FOUND") return NextResponse.json({ error: "Admission not found" }, { status: 404 });
      if (txError.message === "NOT_ADMITTED") return NextResponse.json({ error: "This patient has already been discharged" }, { status: 409 });
      if (txError.message === "NO_BED") return NextResponse.json({ error: "This admission has no bed assigned" }, { status: 409 });
      throw txError;
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "discharge",
      entityType: "admission",
      entityId: id,
      details: { dischargeSummary: dischargeSummary.trim() },
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error discharging patient:", error);
    return NextResponse.json({ error: "Failed to discharge patient" }, { status: 500 });
  }
}
