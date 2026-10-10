import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientMerges, patients, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requirePermission } from "@/lib/authz";
import { MPI_VIEW } from "@/lib/mpi/access";

const survivor = alias(patients, "survivor");

// GET /api/patients/merges — merge history (newest first).
export async function GET() {
  try {
    const authz = await requirePermission(MPI_VIEW);
    if (authz.error) return authz.error;
    const rows = await db
      .select({
        id: patientMerges.id,
        survivorId: patientMerges.survivorId,
        survivorFirstname: survivor.firstname,
        survivorLastname: survivor.lastname,
        survivorMrn: survivor.mrn,
        mergedId: patientMerges.mergedId,
        snapshot: patientMerges.snapshot,
        reason: patientMerges.reason,
        matchScore: patientMerges.matchScore,
        repointed: patientMerges.repointed,
        walletTransfer: patientMerges.walletTransfer,
        mergedAt: patientMerges.mergedAt,
        mergedByFirstname: users.firstname,
        mergedByLastname: users.lastname,
        undoneAt: patientMerges.undoneAt,
        undoReason: patientMerges.undoReason,
      })
      .from(patientMerges)
      .leftJoin(survivor, eq(patientMerges.survivorId, survivor.id))
      .leftJoin(users, eq(patientMerges.mergedBy, users.id))
      .where(eq(patientMerges.organisationId, authz.ctx.orgId))
      .orderBy(desc(patientMerges.mergedAt))
      .limit(200);
    return NextResponse.json(
      rows.map(({ snapshot, repointed, ...r }) => {
        const m = (snapshot as { merged?: { firstname?: string; lastname?: string; mrn?: string } }).merged ?? {};
        return {
          ...r,
          mergedFirstname: m.firstname ?? null,
          mergedLastname: m.lastname ?? null,
          mergedMrn: m.mrn ?? null,
          movedCount: Object.values(repointed as Record<string, number[]>).reduce((s, ids) => s + ids.length, 0),
        };
      }),
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching merges:", error);
    return NextResponse.json({ error: "Failed to fetch merge history" }, { status: 500 });
  }
}
