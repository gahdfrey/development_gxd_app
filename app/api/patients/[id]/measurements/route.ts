import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientMeasurements } from "@/lib/db/schema";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { CLINICAL_EDIT } from "@/lib/clinical/access";
import { findPatientInOrg } from "@/lib/clinical/summary";

const optionalNumber = (v: unknown) => (v === undefined || v === null || v === "" ? null : Number(v));

// POST /api/patients/[id]/measurements { weightKg?, heightCm?, source?, measuredAt?, notes? }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const patient = await findPatientInOrg(db, orgId, (await params).id);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const body = await request.json();
    const weightKg = optionalNumber(body.weightKg);
    const heightCm = optionalNumber(body.heightCm);
    if (weightKg == null && heightCm == null) return NextResponse.json({ error: "Enter a weight or a height" }, { status: 400 });
    // Generous physiological bounds — catch typos (e.g. 700 kg, grams entered as kg).
    if (weightKg != null && (!Number.isFinite(weightKg) || weightKg < 0.3 || weightKg > 350)) {
      return NextResponse.json({ error: "Weight must be between 0.3 and 350 kg" }, { status: 400 });
    }
    if (heightCm != null && (!Number.isFinite(heightCm) || heightCm < 20 || heightCm > 250)) {
      return NextResponse.json({ error: "Height must be between 20 and 250 cm" }, { status: 400 });
    }
    const source = body.source === "reported" ? "reported" : "measured";
    const measuredAt = body.measuredAt ? new Date(body.measuredAt) : new Date();
    if (isNaN(measuredAt.getTime()) || measuredAt.getTime() > Date.now() + 5 * 60_000) {
      return NextResponse.json({ error: "Invalid measurement time" }, { status: 400 });
    }

    const [created] = await db
      .insert(patientMeasurements)
      .values({
        organisationId: orgId,
        patientId: patient.id,
        weightKg: weightKg != null ? Math.round(weightKg * 100) / 100 : null,
        heightCm: heightCm != null ? Math.round(heightCm * 10) / 10 : null,
        source,
        measuredAt,
        notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        recordedBy: userId,
      })
      .returning();

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "create",
      entityType: "patient_measurement",
      entityId: created.id,
      details: { patientId: patient.id, weightKg: created.weightKg, heightCm: created.heightCm },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error recording measurement:", error);
    return NextResponse.json({ error: "Failed to record measurement" }, { status: 500 });
  }
}
