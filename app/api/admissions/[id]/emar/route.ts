import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admissions } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { CLINICAL_EDIT, CLINICAL_VIEW } from "@/lib/clinical/access";
import { getMedicationChart } from "@/lib/emar/chart";
import { recordAdministration } from "@/lib/emar/record";
import { todayWat } from "@/lib/emar/schedule";

type Params = { params: Promise<{ id: string }> };

async function findAdmission(orgId: number, idParam: string) {
  const id = parseInt(idParam);
  if (isNaN(id)) return null;
  const [a] = await db
    .select({ id: admissions.id, patientId: admissions.patientId, status: admissions.status })
    .from(admissions)
    .where(and(eq(admissions.id, id), eq(admissions.organisationId, orgId)))
    .limit(1);
  return a ?? null;
}

// GET /api/admissions/[id]/emar?date=YYYY-MM-DD — the medication chart for a day.
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(CLINICAL_VIEW);
    if (authz.error) return authz.error;
    const admission = await findAdmission(authz.ctx.orgId, (await params).id);
    if (!admission) return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    const date = new URL(request.url).searchParams.get("date");
    const chart = await getMedicationChart(db, authz.ctx.orgId, admission.id, date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayWat());
    return NextResponse.json({ ...chart, admissionStatus: admission.status }, { status: 200 });
  } catch (error) {
    console.error("Error fetching medication chart:", error);
    return NextResponse.json({ error: "Failed to fetch medication chart" }, { status: 500 });
  }
}

// POST /api/admissions/[id]/emar — record a dose given / held / refused /
// not available / missed (see lib/emar/record.ts for the safety checks).
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission(CLINICAL_EDIT);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const admission = await findAdmission(orgId, (await params).id);
    if (!admission) return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    if (admission.status !== "admitted") return NextResponse.json({ error: "The patient is no longer admitted" }, { status: 400 });

    const input = await request.json();
    const outcome = await db.transaction((tx) =>
      recordAdministration(tx, { orgId, userId, admissionId: admission.id, patientId: admission.patientId, input }),
    );
    if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: outcome.status ?? 400 });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: `emar.${outcome.event.status}`,
      entityType: "medication_administration",
      entityId: outcome.event.id,
      details: {
        prescriptionId: outcome.event.prescriptionId,
        scheduledAt: outcome.event.scheduledAt,
        doseGiven: outcome.event.doseGiven,
        reason: outcome.event.reason,
        witnessedBy: outcome.event.witnessedBy,
      },
    });
    return NextResponse.json(outcome.event, { status: 201 });
  } catch (error) {
    console.error("Error recording administration:", error);
    return NextResponse.json({ error: "Failed to record dose" }, { status: 500 });
  }
}
