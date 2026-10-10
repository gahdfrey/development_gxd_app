import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients, patientAllergies } from "@/lib/db/schema";
import { and, eq, isNull, ne } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { CLINICAL_EDIT } from "@/lib/clinical/access";
import { findPatientInOrg } from "@/lib/clinical/summary";

// PUT /api/patients/[id]/allergy-status { status: "nkda" | "not_assessed" }
// "has_allergies" isn't set directly — it follows from the allergy list.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const patient = await findPatientInOrg(db, orgId, (await params).id);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const { status } = await request.json();
    if (status !== "nkda" && status !== "not_assessed") {
      return NextResponse.json({ error: "Invalid allergy status" }, { status: 400 });
    }

    if (status === "nkda") {
      const [active] = await db
        .select({ id: patientAllergies.id })
        .from(patientAllergies)
        .where(and(eq(patientAllergies.patientId, patient.id), isNull(patientAllergies.deletedAt), ne(patientAllergies.verification, "refuted")))
        .limit(1);
      if (active) {
        return NextResponse.json(
          { error: "This patient has recorded allergies. Mark them refuted or remove them before recording “no known allergies”." },
          { status: 409 },
        );
      }
    }

    await db
      .update(patients)
      .set({ allergyStatus: status, allergyStatusUpdatedAt: new Date(), allergyStatusUpdatedBy: userId })
      .where(eq(patients.id, patient.id));

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "update",
      entityType: "patient_allergy_status",
      entityId: patient.id,
      details: { before: patient.allergyStatus, after: status },
    });

    return NextResponse.json({ allergyStatus: status }, { status: 200 });
  } catch (error) {
    console.error("Error updating allergy status:", error);
    return NextResponse.json({ error: "Failed to update allergy status" }, { status: 500 });
  }
}
