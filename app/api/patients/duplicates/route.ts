import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { MPI_VIEW } from "@/lib/mpi/access";
import { findDuplicatePairs } from "@/lib/mpi/candidates";

// GET /api/patients/duplicates — likely duplicate record pairs for review.
export async function GET() {
  try {
    const authz = await requirePermission(MPI_VIEW);
    if (authz.error) return authz.error;
    const pairs = await findDuplicatePairs(db, authz.ctx.orgId);
    return NextResponse.json(pairs, { status: 200 });
  } catch (error) {
    console.error("Error finding duplicates:", error);
    return NextResponse.json({ error: "Failed to find duplicates" }, { status: 500 });
  }
}
