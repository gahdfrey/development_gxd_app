import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientProblems } from "@/lib/db/schema";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { CLINICAL_EDIT } from "@/lib/clinical/access";
import { findPatientInOrg } from "@/lib/clinical/summary";
import { findOpenDuplicate, validateProblem } from "@/lib/clinical/problemInput";

// POST /api/patients/[id]/problems — add a condition to the problem list.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const patient = await findPatientInOrg(db, orgId, (await params).id);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const validated = await validateProblem(await request.json());
    if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });
    if (await findOpenDuplicate(db, patient.id, validated.value.icdCode)) {
      return NextResponse.json({ error: "This condition is already on the patient's problem list" }, { status: 409 });
    }

    const [created] = await db
      .insert(patientProblems)
      .values({ ...validated.value, organisationId: orgId, patientId: patient.id, recordedBy: userId })
      .returning();

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "create",
      entityType: "patient_problem",
      entityId: created.id,
      details: { patientId: patient.id, icdCode: created.icdCode, status: created.status },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error adding problem:", error);
    return NextResponse.json({ error: "Failed to add condition" }, { status: 500 });
  }
}
