import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { checkPrescriptionAllergies, OVERRIDE_REASONS } from "@/lib/cds/allergy";
import { findPatientInOrg } from "@/lib/clinical/summary";

// POST /api/cds/prescription-check { patientId, genericIds } — safety alerts
// for drugs being prescribed, so the prescription form can warn as soon as a
// drug is picked. The same check is enforced again when the prescription is
// submitted (POST /api/prescriptions).
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([
      ["my-appointments", "add"],
      ["my-appointments", "edit"],
      ["appointments", "add"],
      ["appointments", "edit"],
      ["pharmacy", "add"],
      ["pharmacy", "view"],
    ]);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const body = await request.json();
    const patient = await findPatientInOrg(db, orgId, Number(body.patientId));
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    const genericIds: number[] = Array.isArray(body.genericIds) ? body.genericIds.map(Number).filter(Number.isInteger) : [];

    const alerts = await checkPrescriptionAllergies(db, orgId, patient.id, genericIds);
    return NextResponse.json({ alerts, overrideReasons: OVERRIDE_REASONS }, { status: 200 });
  } catch (error) {
    console.error("Error running prescription check:", error);
    return NextResponse.json({ error: "Failed to run safety check" }, { status: 500 });
  }
}
