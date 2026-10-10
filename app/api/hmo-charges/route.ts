import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hmoCharges, hmos, patients, claimBatches } from "@/lib/db/schema";
import { and, eq, gte, lt, desc, inArray, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

const STATUSES = ["unclaimed", "claimed", "queried", "paid", "rejected"] as const;

// GET /api/hmo-charges?hmoId=&status=&month=YYYY-MM
// The HMO receivables ledger: the HMO's share of every settled bill item.
export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission([["finance", "view"]]);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const { searchParams } = new URL(request.url);
    const hmoId = searchParams.get("hmoId");
    const status = searchParams.get("status");
    const month = searchParams.get("month");

    const conditions = [eq(hmoCharges.organisationId, orgId)];
    if (hmoId && !isNaN(Number(hmoId))) conditions.push(eq(hmoCharges.hmoId, Number(hmoId)));
    if (status && (STATUSES as readonly string[]).includes(status)) conditions.push(eq(hmoCharges.status, status));
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      // Claim months are Nigerian calendar months (WAT, UTC+1, no DST).
      const [y, m] = month.split("-").map(Number);
      const start = new Date(Date.UTC(y, m - 1, 1, -1));
      const end = new Date(Date.UTC(y, m, 1, -1));
      conditions.push(gte(hmoCharges.serviceDate, start), lt(hmoCharges.serviceDate, end));
    }

    const rows = await db
      .select({
        id: hmoCharges.id,
        hmoId: hmoCharges.hmoId,
        hmoName: hmos.name,
        patientId: hmoCharges.patientId,
        patientFirstname: patients.firstname,
        patientLastname: patients.lastname,
        patientMrn: patients.mrn,
        policyNumber: hmoCharges.policyNumber,
        itemType: hmoCharges.itemType,
        itemId: hmoCharges.itemId,
        description: hmoCharges.description,
        tariffPrice: hmoCharges.tariffPrice,
        hmoAmount: hmoCharges.hmoAmount,
        patientAmount: hmoCharges.patientAmount,
        requiresAuthorization: hmoCharges.requiresAuthorization,
        authorizationCode: hmoCharges.authorizationCode,
        status: hmoCharges.status,
        statusNote: hmoCharges.statusNote,
        serviceDate: hmoCharges.serviceDate,
        paidAmount: hmoCharges.paidAmount,
        claimBatchId: hmoCharges.claimBatchId,
        claimReference: claimBatches.reference,
      })
      .from(hmoCharges)
      .leftJoin(hmos, eq(hmoCharges.hmoId, hmos.id))
      .leftJoin(claimBatches, eq(hmoCharges.claimBatchId, claimBatches.id))
      .leftJoin(patients, eq(hmoCharges.patientId, patients.id))
      .where(and(...conditions))
      .orderBy(desc(hmoCharges.serviceDate));

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching HMO charges:", error);
    return NextResponse.json({ error: "Failed to fetch HMO charges" }, { status: 500 });
  }
}

// PATCH /api/hmo-charges — bulk status update and/or attaching an
// authorization code after the fact ("treat now, attach code later").
// Body: { ids: number[], status?, statusNote?, authorizationCode? }
export async function PATCH(request: NextRequest) {
  try {
    const authz = await requirePermission([["finance", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const body = await request.json();
    const ids: number[] = Array.isArray(body.ids) ? body.ids.filter((v: unknown) => Number.isInteger(v)) : [];
    if (ids.length === 0) return NextResponse.json({ error: "Select at least one charge" }, { status: 400 });

    const set: Partial<typeof hmoCharges.$inferInsert> = { updatedAt: new Date() };
    if (body.status !== undefined) {
      if (!(STATUSES as readonly string[]).includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      set.status = body.status;
      set.statusNote = typeof body.statusNote === "string" && body.statusNote.trim() ? body.statusNote.trim() : null;
      if (body.status === "rejected" && !set.statusNote) {
        return NextResponse.json({ error: "Give the HMO's rejection reason" }, { status: 400 });
      }
    }
    if (typeof body.authorizationCode === "string") {
      set.authorizationCode = body.authorizationCode.trim() || null;
    }
    if (set.status === undefined && set.authorizationCode === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    // Lines in a claim batch get their status from the claim (submission and
    // remittance on the Claims tab), so status changes here only apply to
    // charges not yet in a claim. Auth codes can still be attached.
    const updated = await db
      .update(hmoCharges)
      .set(set)
      .where(and(
        inArray(hmoCharges.id, ids),
        eq(hmoCharges.organisationId, orgId),
        ...(set.status !== undefined ? [isNull(hmoCharges.claimBatchId)] : []),
      ))
      .returning({ id: hmoCharges.id });
    if (set.status !== undefined && updated.length < ids.length) {
      const skipped = ids.length - updated.length;
      if (updated.length === 0) {
        return NextResponse.json(
          { error: `${skipped === 1 ? "That charge is" : "Those charges are"} part of a claim — update ${skipped === 1 ? "it" : "them"} from the Claims tab` },
          { status: 409 },
        );
      }
    }

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "update",
      entityType: "hmo_charge",
      entityId: updated.length === 1 ? updated[0].id : null,
      details: { ids: updated.map((u) => u.id), status: set.status, statusNote: set.statusNote, authorizationCode: set.authorizationCode },
    });

    return NextResponse.json({ updated: updated.length }, { status: 200 });
  } catch (error) {
    console.error("Error updating HMO charges:", error);
    return NextResponse.json({ error: "Failed to update HMO charges" }, { status: 500 });
  }
}
