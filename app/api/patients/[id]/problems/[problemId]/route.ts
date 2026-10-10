import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientProblems } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { CLINICAL_EDIT } from "@/lib/clinical/access";
import { findOpenDuplicate, validateProblem } from "@/lib/clinical/problemInput";

type Params = { params: Promise<{ id: string; problemId: string }> };

async function findProblem(orgId: number, p: { id: string; problemId: string }) {
  const patientId = parseInt(p.id);
  const problemId = parseInt(p.problemId);
  if (isNaN(patientId) || isNaN(problemId)) return null;
  const [row] = await db
    .select()
    .from(patientProblems)
    .where(and(
      eq(patientProblems.id, problemId),
      eq(patientProblems.patientId, patientId),
      eq(patientProblems.organisationId, orgId),
      isNull(patientProblems.deletedAt),
    ))
    .limit(1);
  return row ?? null;
}

// PATCH — edit, or change status (resolve / reactivate).
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const existing = await findProblem(orgId, await params);
    if (!existing) return NextResponse.json({ error: "Condition not found" }, { status: 404 });

    const body = await request.json();
    const validated = await validateProblem({
      ...existing,
      ...body,
      // Reactivating clears the old resolution date unless one is given.
      resolvedDate: body.resolvedDate !== undefined ? body.resolvedDate : body.status && body.status !== existing.status ? null : existing.resolvedDate,
    });
    if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
    if (validated.value.status !== "resolved" && (await findOpenDuplicate(db, existing.patientId, validated.value.icdCode, existing.id))) {
      return NextResponse.json({ error: "This condition is already active on the problem list" }, { status: 409 });
    }

    const [updated] = await db
      .update(patientProblems)
      .set({ ...validated.value, updatedAt: new Date() })
      .where(eq(patientProblems.id, existing.id))
      .returning();

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "update",
      entityType: "patient_problem",
      entityId: existing.id,
      details: { patientId: existing.patientId, before: { status: existing.status }, after: validated.value },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating problem:", error);
    return NextResponse.json({ error: "Failed to update condition" }, { status: 500 });
  }
}

// DELETE — remove an entry made in error (soft delete). A condition the
// patient no longer has should be PATCHed to "resolved" instead.
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const existing = await findProblem(orgId, await params);
    if (!existing) return NextResponse.json({ error: "Condition not found" }, { status: 404 });

    await db.update(patientProblems).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(patientProblems.id, existing.id));

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "delete",
      entityType: "patient_problem",
      entityId: existing.id,
      details: { patientId: existing.patientId, icdCode: existing.icdCode, reason: "entered in error" },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting problem:", error);
    return NextResponse.json({ error: "Failed to remove condition" }, { status: 500 });
  }
}
