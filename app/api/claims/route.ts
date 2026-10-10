import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { claimBatches, hmoCharges, hmos } from "@/lib/db/schema";
import { and, desc, eq, gte, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { monthBounds, nextBatchReference } from "@/lib/billing/claims";

const AGE_BUCKETS = [
  { key: "d0_30", label: "0–30 days", max: 30 },
  { key: "d31_60", label: "31–60 days", max: 60 },
  { key: "d61_90", label: "61–90 days", max: 90 },
  { key: "d90_plus", label: "90+ days", max: Infinity },
] as const;

// GET /api/claims?hmoId=&status= — claim batches with line totals, plus an
// ageing summary of what HMOs still owe on submitted claims.
export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission([["finance", "view"]]);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const { searchParams } = new URL(request.url);
    const hmoId = searchParams.get("hmoId");
    const status = searchParams.get("status");

    const conditions = [eq(claimBatches.organisationId, orgId), ne(claimBatches.status, "cancelled")];
    if (hmoId && !isNaN(Number(hmoId))) conditions.push(eq(claimBatches.hmoId, Number(hmoId)));
    if (status && ["draft", "submitted", "closed"].includes(status)) conditions.push(eq(claimBatches.status, status));

    const batches = await db
      .select({
        id: claimBatches.id,
        hmoId: claimBatches.hmoId,
        hmoName: hmos.name,
        periodMonth: claimBatches.periodMonth,
        reference: claimBatches.reference,
        status: claimBatches.status,
        submittedAt: claimBatches.submittedAt,
        hmoReference: claimBatches.hmoReference,
        totalClaimed: claimBatches.totalClaimed,
        createdAt: claimBatches.createdAt,
        lineCount: sql<number>`(SELECT count(*)::int FROM hmo_charges c WHERE c.claim_batch_id = ${claimBatches.id})`,
        lineTotal: sql<number>`(SELECT coalesce(sum(c.hmo_amount), 0)::int FROM hmo_charges c WHERE c.claim_batch_id = ${claimBatches.id})`,
        paidTotal: sql<number>`(SELECT coalesce(sum(c.paid_amount), 0)::int FROM hmo_charges c WHERE c.claim_batch_id = ${claimBatches.id} AND c.status = 'paid')`,
        rejectedTotal: sql<number>`(SELECT coalesce(sum(c.hmo_amount), 0)::int FROM hmo_charges c WHERE c.claim_batch_id = ${claimBatches.id} AND c.status = 'rejected')`,
        queriedCount: sql<number>`(SELECT count(*)::int FROM hmo_charges c WHERE c.claim_batch_id = ${claimBatches.id} AND c.status = 'queried')`,
      })
      .from(claimBatches)
      .leftJoin(hmos, eq(claimBatches.hmoId, hmos.id))
      .where(and(...conditions))
      .orderBy(desc(claimBatches.createdAt));

    // Ageing: outstanding (claimed/queried) lines in submitted batches, by
    // days since the batch was submitted, per HMO.
    const outstanding = await db
      .select({
        hmoId: hmoCharges.hmoId,
        hmoName: hmos.name,
        amount: hmoCharges.hmoAmount,
        submittedAt: claimBatches.submittedAt,
      })
      .from(hmoCharges)
      .innerJoin(claimBatches, eq(hmoCharges.claimBatchId, claimBatches.id))
      .leftJoin(hmos, eq(hmoCharges.hmoId, hmos.id))
      .where(and(
        eq(hmoCharges.organisationId, orgId),
        inArray(hmoCharges.status, ["claimed", "queried"]),
        eq(claimBatches.status, "submitted"),
      ));
    const ageing = new Map<number, { hmoId: number; hmoName: string | null; total: number } & Record<(typeof AGE_BUCKETS)[number]["key"], number>>();
    for (const o of outstanding) {
      const days = o.submittedAt ? Math.floor((Date.now() - o.submittedAt.getTime()) / 86_400_000) : 0;
      const bucket = AGE_BUCKETS.find((b) => days <= b.max)!;
      const row = ageing.get(o.hmoId) ?? { hmoId: o.hmoId, hmoName: o.hmoName, total: 0, d0_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0 };
      row[bucket.key] += o.amount;
      row.total += o.amount;
      ageing.set(o.hmoId, row);
    }

    return NextResponse.json(
      { batches, ageing: [...ageing.values()].sort((a, b) => b.total - a.total), buckets: AGE_BUCKETS.map(({ key, label }) => ({ key, label })) },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching claims:", error);
    return NextResponse.json({ error: "Failed to fetch claims" }, { status: 500 });
  }
}

// POST /api/claims { hmoId, month } — start a draft claim batch containing
// every unclaimed, not-yet-batched HMO charge for that HMO and service month.
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["finance", "add"], ["finance", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const body = await request.json();
    const hmoId = Number(body.hmoId);
    const month = typeof body.month === "string" && /^\d{4}-\d{2}$/.test(body.month) ? body.month : null;
    if (!Number.isInteger(hmoId)) return NextResponse.json({ error: "Select the HMO" }, { status: 400 });
    if (!month) return NextResponse.json({ error: "Select the service month" }, { status: 400 });

    const [hmo] = await db
      .select({ id: hmos.id })
      .from(hmos)
      .where(and(eq(hmos.id, hmoId), eq(hmos.organisationId, orgId)))
      .limit(1);
    if (!hmo) return NextResponse.json({ error: "HMO not found" }, { status: 404 });

    const { start, end } = monthBounds(month);
    const lineFilter = and(
      eq(hmoCharges.organisationId, orgId),
      eq(hmoCharges.hmoId, hmoId),
      eq(hmoCharges.status, "unclaimed"),
      isNull(hmoCharges.claimBatchId),
      gte(hmoCharges.serviceDate, start),
      lt(hmoCharges.serviceDate, end),
    );

    const batch = await db.transaction(async (tx) => {
      const [{ count }] = await tx.select({ count: sql<number>`count(*)::int` }).from(hmoCharges).where(lineFilter);
      if (count === 0) return null;
      const reference = await nextBatchReference(tx, orgId, hmoId, month);
      const [row] = await tx
        .insert(claimBatches)
        .values({ organisationId: orgId, hmoId, periodMonth: month, reference, status: "draft", createdBy: userId })
        .returning();
      await tx.update(hmoCharges).set({ claimBatchId: row.id, updatedAt: new Date() }).where(lineFilter);
      return { ...row, lineCount: count };
    });

    if (!batch) {
      return NextResponse.json(
        { error: "No unclaimed charges for this HMO in that month (they may already be in another claim)" },
        { status: 400 },
      );
    }

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "create",
      entityType: "claim_batch",
      entityId: batch.id,
      details: { reference: batch.reference, hmoId, month, lines: batch.lineCount },
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    console.error("Error creating claim batch:", error);
    return NextResponse.json({ error: "Failed to create claim batch" }, { status: 500 });
  }
}
