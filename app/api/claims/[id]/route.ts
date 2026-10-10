import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claimBatches, hmoCharges, hmos, patients, users } from "@/lib/db/schema";
import { and, asc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { getLineDiagnoses, monthBounds, scrubCharges } from "@/lib/billing/claims";

type Params = { params: Promise<{ id: string }> };

async function loadBatch(orgId: number, idParam: string) {
  const id = parseInt(idParam);
  if (isNaN(id)) return null;
  const [batch] = await db
    .select({
      id: claimBatches.id,
      hmoId: claimBatches.hmoId,
      hmoName: hmos.name,
      hmoCode: hmos.code,
      hmoEmail: hmos.email,
      claimSubmissionDays: hmos.claimSubmissionDays,
      periodMonth: claimBatches.periodMonth,
      reference: claimBatches.reference,
      status: claimBatches.status,
      submittedAt: claimBatches.submittedAt,
      submissionChannel: claimBatches.submissionChannel,
      hmoReference: claimBatches.hmoReference,
      totalClaimed: claimBatches.totalClaimed,
      notes: claimBatches.notes,
      createdAt: claimBatches.createdAt,
      submittedByFirstname: users.firstname,
      submittedByLastname: users.lastname,
    })
    .from(claimBatches)
    .leftJoin(hmos, eq(claimBatches.hmoId, hmos.id))
    .leftJoin(users, eq(claimBatches.submittedBy, users.id))
    .where(and(eq(claimBatches.id, id), eq(claimBatches.organisationId, orgId)))
    .limit(1);
  return batch && batch.status !== "cancelled" ? batch : null;
}

// GET /api/claims/[id] — the batch, its lines and each line's pre-submission
// check results.
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["finance", "view"]]);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const batch = await loadBatch(orgId, (await params).id);
    if (!batch) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

    const lines = await db
      .select({
        id: hmoCharges.id,
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
        authorizationCode: hmoCharges.authorizationCode,
        status: hmoCharges.status,
        statusNote: hmoCharges.statusNote,
        paidAmount: hmoCharges.paidAmount,
        paidAt: hmoCharges.paidAt,
        serviceDate: hmoCharges.serviceDate,
      })
      .from(hmoCharges)
      .leftJoin(patients, eq(hmoCharges.patientId, patients.id))
      .where(and(eq(hmoCharges.claimBatchId, batch.id), eq(hmoCharges.organisationId, orgId)))
      .orderBy(asc(hmoCharges.serviceDate), asc(patients.lastname));

    // Checks matter before submission (and are informative afterwards).
    const issues = await scrubCharges(db, orgId, lines.map((l) => l.id), batch.submittedAt ?? new Date());
    const diagnoses = await getLineDiagnoses(db, lines);

    // Newly settled charges for this HMO/month not yet in any claim — a draft
    // can pull them in.
    let unbatchedCount = 0;
    if (batch.status === "draft") {
      const { start, end } = monthBounds(batch.periodMonth);
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(hmoCharges)
        .where(and(
          eq(hmoCharges.organisationId, orgId),
          eq(hmoCharges.hmoId, batch.hmoId),
          eq(hmoCharges.status, "unclaimed"),
          isNull(hmoCharges.claimBatchId),
          gte(hmoCharges.serviceDate, start),
          lt(hmoCharges.serviceDate, end),
        ));
      unbatchedCount = count;
    }

    return NextResponse.json(
      {
        ...batch,
        unbatchedCount,
        lines: lines.map((l) => ({ ...l, diagnosis: diagnoses.get(l.id) ?? null, issues: issues.get(l.id) ?? [] })),
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching claim:", error);
    return NextResponse.json({ error: "Failed to fetch claim" }, { status: 500 });
  }
}

/**
 * PATCH /api/claims/[id] — Body: { action, ... }
 *   remove_lines { chargeIds }     draft: take lines out (back to unclaimed, unbatched)
 *   add_unbatched                  draft: pull in new unclaimed charges for the HMO/month
 *   submit { submissionChannel, hmoReference?, allowErrors? }
 *                                  draft → submitted; lines → claimed; total snapshotted.
 *                                  Refused while lines have check errors unless allowErrors.
 *   update { hmoReference?, notes? }
 *   cancel                         draft: discard the batch, releasing its lines
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["finance", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const batch = await loadBatch(orgId, (await params).id);
    if (!batch) return NextResponse.json({ error: "Claim not found" }, { status: 404 });

    const body = await request.json();
    const action = body.action as string;
    const now = new Date();
    const text = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
    const draftOnly = () =>
      batch.status !== "draft"
        ? NextResponse.json({ error: "This claim has already been submitted" }, { status: 409 })
        : null;
    let details: Record<string, unknown> = {};

    switch (action) {
      case "remove_lines": {
        const err = draftOnly();
        if (err) return err;
        const ids: number[] = Array.isArray(body.chargeIds) ? body.chargeIds.filter(Number.isInteger) : [];
        if (ids.length === 0) return NextResponse.json({ error: "Select lines to remove" }, { status: 400 });
        const removed = await db
          .update(hmoCharges)
          .set({ claimBatchId: null, updatedAt: now })
          .where(and(eq(hmoCharges.claimBatchId, batch.id), inArray(hmoCharges.id, ids)))
          .returning({ id: hmoCharges.id });
        details = { removed: removed.map((r) => r.id) };
        break;
      }
      case "add_unbatched": {
        const err = draftOnly();
        if (err) return err;
        const { start, end } = monthBounds(batch.periodMonth);
        const added = await db
          .update(hmoCharges)
          .set({ claimBatchId: batch.id, updatedAt: now })
          .where(and(
            eq(hmoCharges.organisationId, orgId),
            eq(hmoCharges.hmoId, batch.hmoId),
            eq(hmoCharges.status, "unclaimed"),
            isNull(hmoCharges.claimBatchId),
            gte(hmoCharges.serviceDate, start),
            lt(hmoCharges.serviceDate, end),
          ))
          .returning({ id: hmoCharges.id });
        details = { added: added.length };
        break;
      }
      case "submit": {
        const err = draftOnly();
        if (err) return err;
        const channel = text(body.submissionChannel);
        if (!channel || !["email", "hmo_portal", "hand_delivery", "other"].includes(channel)) {
          return NextResponse.json({ error: "Select how the claim was submitted" }, { status: 400 });
        }
        const lines = await db.select({ id: hmoCharges.id, hmoAmount: hmoCharges.hmoAmount }).from(hmoCharges).where(eq(hmoCharges.claimBatchId, batch.id));
        if (lines.length === 0) return NextResponse.json({ error: "The claim has no lines" }, { status: 400 });
        const issues = await scrubCharges(db, orgId, lines.map((l) => l.id));
        const errorLines = [...issues.values()].filter((list) => list.some((i) => i.severity === "error")).length;
        if (errorLines > 0 && body.allowErrors !== true) {
          return NextResponse.json(
            { error: `${errorLines} line${errorLines === 1 ? " has" : "s have"} errors the HMO is likely to reject. Fix or remove them, or confirm to submit anyway.`, errorLines },
            { status: 409 },
          );
        }
        const total = lines.reduce((s, l) => s + l.hmoAmount, 0);
        await db.transaction(async (tx) => {
          await tx
            .update(claimBatches)
            .set({ status: "submitted", submittedAt: now, submittedBy: userId, submissionChannel: channel, hmoReference: text(body.hmoReference), totalClaimed: total, updatedAt: now })
            .where(eq(claimBatches.id, batch.id));
          await tx.update(hmoCharges).set({ status: "claimed", updatedAt: now }).where(eq(hmoCharges.claimBatchId, batch.id));
        });
        details = { lines: lines.length, total, errorLinesSubmitted: errorLines, channel };
        break;
      }
      case "update": {
        await db
          .update(claimBatches)
          .set({
            ...(body.hmoReference !== undefined && { hmoReference: text(body.hmoReference) }),
            ...(body.notes !== undefined && { notes: text(body.notes) }),
            updatedAt: now,
          })
          .where(eq(claimBatches.id, batch.id));
        details = { hmoReference: body.hmoReference, notes: body.notes };
        break;
      }
      case "cancel": {
        const err = draftOnly();
        if (err) return err;
        await db.transaction(async (tx) => {
          await tx.update(hmoCharges).set({ claimBatchId: null, updatedAt: now }).where(eq(hmoCharges.claimBatchId, batch.id));
          await tx.update(claimBatches).set({ status: "cancelled", updatedAt: now }).where(eq(claimBatches.id, batch.id));
        });
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: `claim_batch.${action}`,
      entityType: "claim_batch",
      entityId: batch.id,
      details: { reference: batch.reference, ...details },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating claim:", error);
    return NextResponse.json({ error: "Failed to update claim" }, { status: 500 });
  }
}
