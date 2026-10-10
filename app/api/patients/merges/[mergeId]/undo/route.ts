import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { MPI_MERGE } from "@/lib/mpi/access";
import { undoMerge } from "@/lib/mpi/merge";

// POST /api/patients/merges/[mergeId]/undo { reason } — split a wrong merge.
export async function POST(request: NextRequest, { params }: { params: Promise<{ mergeId: string }> }) {
  try {
    const authz = await requirePermission(MPI_MERGE);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const mergeId = parseInt((await params).mergeId);
    if (isNaN(mergeId)) return NextResponse.json({ error: "Invalid merge" }, { status: 400 });
    const body = await request.json();
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (!reason) return NextResponse.json({ error: "Say why the merge is being undone" }, { status: 400 });

    const outcome = await db.transaction((tx) => undoMerge(tx, { orgId, userId, mergeId, reason }));
    if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status ?? 400 });

    void logAudit({ organisationId: orgId, userId, userEmail, action: "mpi.unmerge", entityType: "patient", entityId: outcome.restoredPatientId, details: { mergeId, reason } });
    return NextResponse.json(outcome, { status: 200 });
  } catch (error) {
    console.error("Error undoing merge:", error);
    return NextResponse.json({ error: "Failed to undo merge" }, { status: 500 });
  }
}
