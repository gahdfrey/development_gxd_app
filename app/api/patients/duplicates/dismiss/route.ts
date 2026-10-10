import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, patientDuplicateDismissals } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { MPI_EDIT } from "@/lib/mpi/access";

// POST /api/patients/duplicates/dismiss { aId, bId, note? } — "these are
// different people": stop suggesting this pair.
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(MPI_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const body = await request.json();
    const a = Number(body.aId);
    const b = Number(body.bId);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) return NextResponse.json({ error: "Invalid pair" }, { status: 400 });
    const found = await db.select({ id: patients.id }).from(patients).where(and(inArray(patients.id, [a, b]), eq(patients.organisationId, orgId)));
    if (found.length !== 2) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const [lowId, highId] = a < b ? [a, b] : [b, a];
    await db
      .insert(patientDuplicateDismissals)
      .values({ organisationId: orgId, lowId, highId, note: typeof body.note === "string" && body.note.trim() ? body.note.trim() : null, dismissedBy: userId })
      .onConflictDoNothing();
    void logAudit({ organisationId: orgId, userId, userEmail, action: "mpi.not_duplicate", entityType: "patient", entityId: `${lowId},${highId}`, details: { note: body.note } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error dismissing duplicate:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
