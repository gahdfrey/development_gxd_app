import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { vitalSigns, admissions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { CLINICAL_EDIT, CLINICAL_VIEW } from "@/lib/clinical/access";
import { listVitals, prepareVitals, vitalsContext } from "@/lib/clinical/vitals";

type Params = { params: Promise<{ id: string }> };

// GET /api/patients/[id]/vitals — recent observations + scoring context
// (age, pregnancy from the problem list, which score applies).
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(CLINICAL_VIEW);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;
    const patientId = parseInt((await params).id);
    if (isNaN(patientId)) return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });

    const context = await vitalsContext(db, orgId, patientId);
    if (!context) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    const items = await listVitals(db, orgId, patientId);
    const latest = items[0] ?? null;
    return NextResponse.json(
      { context, items, latest, overdue: latest?.nextDueAt ? latest.nextDueAt.getTime() < Date.now() : false },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching vitals:", error);
    return NextResponse.json({ error: "Failed to fetch observations" }, { status: 500 });
  }
}

// POST /api/patients/[id]/vitals — record a set of observations; the
// early-warning score is calculated here, never trusted from the client.
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const patientId = parseInt((await params).id);
    if (isNaN(patientId)) return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });

    const context = await vitalsContext(db, orgId, patientId);
    if (!context) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const body = await request.json();
    const prepared = prepareVitals(body, context);
    if ("error" in prepared) return NextResponse.json({ error: prepared.error }, { status: 400 });

    // Attach to the given admission (must be this patient's) or the current one.
    let admissionId: number | null = context.currentAdmissionId;
    if (body.admissionId != null && body.admissionId !== "") {
      const [adm] = await db
        .select({ id: admissions.id })
        .from(admissions)
        .where(and(eq(admissions.id, Number(body.admissionId)), eq(admissions.patientId, patientId), eq(admissions.organisationId, orgId)))
        .limit(1);
      if (!adm) return NextResponse.json({ error: "Admission not found for this patient" }, { status: 400 });
      admissionId = adm.id;
    }

    const [created] = await db
      .insert(vitalSigns)
      .values({ ...prepared.value, organisationId: orgId, patientId, admissionId, recordedBy: userId })
      .returning();

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "create",
      entityType: "vital_signs",
      entityId: created.id,
      details: { patientId, scoreType: created.scoreType, score: created.score, band: created.band, escalatedTo: created.escalatedTo },
    });

    return NextResponse.json({ ...created, result: prepared.result }, { status: 201 });
  } catch (error) {
    console.error("Error recording vitals:", error);
    return NextResponse.json({ error: "Failed to record observations" }, { status: 500 });
  }
}
