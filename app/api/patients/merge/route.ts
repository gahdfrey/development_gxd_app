import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { MPI_MERGE } from "@/lib/mpi/access";
import { mergePatients } from "@/lib/mpi/merge";

// POST /api/patients/merge { survivorId, mergedId, reason } — merge a
// duplicate into the record being kept. Undo via /api/patients/merges/[id]/undo.
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(MPI_MERGE);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const body = await request.json();
    const survivorId = Number(body.survivorId);
    const mergedId = Number(body.mergedId);
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;
    if (!Number.isInteger(survivorId) || !Number.isInteger(mergedId)) return NextResponse.json({ error: "Choose the two records" }, { status: 400 });
    if (!reason) return NextResponse.json({ error: "Say how you confirmed these are the same person" }, { status: 400 });

    const outcome = await db.transaction((tx) => mergePatients(tx, { orgId, userId, survivorId, mergedId, reason }));
    if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status ?? 400 });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "mpi.merge",
      entityType: "patient",
      entityId: survivorId,
      details: { survivorId, mergedId, reason, mergeId: outcome.mergeId, moved: outcome.moved, walletTransfer: outcome.walletTransfer },
    });
    return NextResponse.json(outcome, { status: 200 });
  } catch (error) {
    console.error("Error merging patients:", error);
    return NextResponse.json({ error: "Failed to merge records" }, { status: 500 });
  }
}
