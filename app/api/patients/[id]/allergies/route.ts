import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientAllergies } from "@/lib/db/schema";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { CLINICAL_EDIT } from "@/lib/clinical/access";
import { findPatientInOrg, syncAllergyStatus } from "@/lib/clinical/summary";
import { validateAllergy } from "@/lib/clinical/allergyInput";

// POST /api/patients/[id]/allergies — record an allergy / intolerance.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const patient = await findPatientInOrg(db, orgId, (await params).id);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const validated = await validateAllergy(orgId, await request.json());
    if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });

    const created = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(patientAllergies)
        .values({ ...validated.value, organisationId: orgId, patientId: patient.id, recordedBy: userId })
        .returning();
      await syncAllergyStatus(tx, patient.id, userId);
      return row;
    });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "create",
      entityType: "patient_allergy",
      entityId: created.id,
      details: { patientId: patient.id, category: created.category, substance: created.substance, severity: created.severity },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error recording allergy:", error);
    return NextResponse.json({ error: "Failed to record allergy" }, { status: 500 });
  }
}
