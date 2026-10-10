import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claimBatches, hmoCharges } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { closeBatchIfSettled } from "@/lib/billing/claims";

/**
 * PATCH /api/claims/[id]/lines — post the HMO's response (remittance) for
 * lines of a submitted claim. Body: { chargeIds, outcome, paidAmount?, note? }
 *   paid      HMO paid the line; paidAmount (single line only) defaults to
 *             the full claimed amount — enter less for a short payment
 *   rejected  HMO refused it; note (the reason) required
 *   queried   HMO asked a question; note required
 *   claimed   query answered / outcome undone — back to awaiting payment
 * The batch closes automatically once every line is paid or rejected.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission([["finance", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const batchId = parseInt((await params).id);
    if (isNaN(batchId)) return NextResponse.json({ error: "Invalid claim ID" }, { status: 400 });
    const [batch] = await db
      .select({ id: claimBatches.id, status: claimBatches.status, reference: claimBatches.reference })
      .from(claimBatches)
      .where(and(eq(claimBatches.id, batchId), eq(claimBatches.organisationId, orgId)))
      .limit(1);
    if (!batch || batch.status === "cancelled") return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    if (batch.status === "draft") return NextResponse.json({ error: "Submit the claim before posting HMO responses" }, { status: 409 });

    const body = await request.json();
    const ids: number[] = Array.isArray(body.chargeIds) ? body.chargeIds.filter(Number.isInteger) : [];
    const outcome = body.outcome as string;
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;
    if (ids.length === 0) return NextResponse.json({ error: "Select at least one line" }, { status: 400 });
    if (!["paid", "rejected", "queried", "claimed"].includes(outcome)) return NextResponse.json({ error: "Invalid outcome" }, { status: 400 });
    if ((outcome === "rejected" || outcome === "queried") && !note) {
      return NextResponse.json({ error: outcome === "rejected" ? "Give the HMO's rejection reason" : "Note the HMO's query" }, { status: 400 });
    }

    let paidAmount: number | undefined;
    if (outcome === "paid" && body.paidAmount !== undefined && body.paidAmount !== null && body.paidAmount !== "") {
      if (ids.length !== 1) return NextResponse.json({ error: "A custom paid amount can only be posted one line at a time" }, { status: 400 });
      paidAmount = Number(body.paidAmount);
      if (!Number.isInteger(paidAmount) || paidAmount < 0) return NextResponse.json({ error: "Paid amount must be a whole Naira amount" }, { status: 400 });
    }

    const now = new Date();
    const lineFilter = and(eq(hmoCharges.claimBatchId, batchId), inArray(hmoCharges.id, ids));
    const updated = await db.transaction(async (tx) => {
      let rows: { id: number }[];
      if (outcome === "paid") {
        if (paidAmount !== undefined) {
          rows = await tx.update(hmoCharges).set({ status: "paid", paidAmount, paidAt: now, statusNote: note, updatedAt: now }).where(lineFilter).returning({ id: hmoCharges.id });
        } else {
          // Paid in full: each line's own claimed amount.
          const lines = await tx.select({ id: hmoCharges.id, hmoAmount: hmoCharges.hmoAmount }).from(hmoCharges).where(lineFilter);
          for (const l of lines) {
            await tx.update(hmoCharges).set({ status: "paid", paidAmount: l.hmoAmount, paidAt: now, statusNote: note, updatedAt: now }).where(eq(hmoCharges.id, l.id));
          }
          rows = lines;
        }
      } else {
        rows = await tx
          .update(hmoCharges)
          .set({ status: outcome, statusNote: note, paidAmount: null, paidAt: null, updatedAt: now })
          .where(lineFilter)
          .returning({ id: hmoCharges.id });
      }
      await closeBatchIfSettled(tx, batchId);
      return rows;
    });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: `claim_line.${outcome}`,
      entityType: "claim_batch",
      entityId: batchId,
      details: { reference: batch.reference, chargeIds: updated.map((u) => u.id), paidAmount, note },
    });

    return NextResponse.json({ updated: updated.length }, { status: 200 });
  } catch (error) {
    console.error("Error posting claim remittance:", error);
    return NextResponse.json({ error: "Failed to update claim lines" }, { status: 500 });
  }
}
