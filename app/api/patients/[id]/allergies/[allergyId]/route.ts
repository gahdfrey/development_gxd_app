import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientAllergies } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { CLINICAL_EDIT } from "@/lib/clinical/access";
import { syncAllergyStatus } from "@/lib/clinical/summary";
import { validateAllergy } from "@/lib/clinical/allergyInput";

type Params = { params: Promise<{ id: string; allergyId: string }> };

async function findAllergy(orgId: number, p: { id: string; allergyId: string }) {
  const patientId = parseInt(p.id);
  const allergyId = parseInt(p.allergyId);
  if (isNaN(patientId) || isNaN(allergyId)) return null;
  const [row] = await db
    .select()
    .from(patientAllergies)
    .where(and(
      eq(patientAllergies.id, allergyId),
      eq(patientAllergies.patientId, patientId),
      eq(patientAllergies.organisationId, orgId),
      isNull(patientAllergies.deletedAt),
    ))
    .limit(1);
  return row ?? null;
}

// PATCH — edit an allergy (incl. marking it confirmed or refuted).
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const existing = await findAllergy(orgId, await params);
    if (!existing) return NextResponse.json({ error: "Allergy not found" }, { status: 404 });

    const validated = await validateAllergy(orgId, { ...existing, ...(await request.json()) });
    if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(patientAllergies)
        .set({ ...validated.value, updatedAt: new Date() })
        .where(eq(patientAllergies.id, existing.id))
        .returning();
      await syncAllergyStatus(tx, existing.patientId, userId);
      return row;
    });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "update",
      entityType: "patient_allergy",
      entityId: existing.id,
      details: { patientId: existing.patientId, before: { severity: existing.severity, verification: existing.verification }, after: validated.value },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating allergy:", error);
    return NextResponse.json({ error: "Failed to update allergy" }, { status: 500 });
  }
}

// DELETE — remove an allergy entered in error (soft delete). An allergy that
// was tested and ruled out should be PATCHed to verification "refuted"
// instead, so the history shows it was considered.
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const existing = await findAllergy(orgId, await params);
    if (!existing) return NextResponse.json({ error: "Allergy not found" }, { status: 404 });

    await db.transaction(async (tx) => {
      await tx.update(patientAllergies).set({ deletedAt: new Date(), updatedAt: new Date() }).where(eq(patientAllergies.id, existing.id));
      await syncAllergyStatus(tx, existing.patientId, userId);
    });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "delete",
      entityType: "patient_allergy",
      entityId: existing.id,
      details: { patientId: existing.patientId, substance: existing.substance, reason: "entered in error" },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting allergy:", error);
    return NextResponse.json({ error: "Failed to delete allergy" }, { status: 500 });
  }
}
