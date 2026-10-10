import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { sql } from "drizzle-orm";
import { CLINICAL_VIEW } from "@/lib/clinical/access";

// GET /api/vitals/ward — for every currently admitted patient, their latest
// observations score and when the next set is due (for the admissions list
// and ward board). Keyed by admission id.
export async function GET() {
  try {
    const authz = await requirePermission(CLINICAL_VIEW);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const rows = (await db.execute(sql`
      SELECT DISTINCT ON (a.id)
        a.id AS "admissionId", a.patient_id AS "patientId",
        v.id AS "vitalId", v.score_type AS "scoreType", v.score, v.band,
        v.recorded_at AS "recordedAt", v.next_due_at AS "nextDueAt", v.escalated_to AS "escalatedTo"
      FROM admissions a
      LEFT JOIN vital_signs v
        ON v.patient_id = a.patient_id AND v.deleted_at IS NULL AND v.recorded_at >= COALESCE(a.admitted_at, a.created_at)
      WHERE a.organisation_id = ${orgId} AND a.status = 'admitted'
      ORDER BY a.id, v.recorded_at DESC NULLS LAST
    `)) as unknown as {
      admissionId: number;
      patientId: number;
      vitalId: number | null;
      scoreType: string | null;
      score: number | null;
      band: string | null;
      recordedAt: string | null;
      nextDueAt: string | null;
      escalatedTo: string | null;
    }[];

    const now = Date.now();
    return NextResponse.json(
      rows.map((r) => ({ ...r, overdue: r.nextDueAt ? new Date(r.nextDueAt).getTime() < now : r.vitalId == null })),
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching ward observations:", error);
    return NextResponse.json({ error: "Failed to fetch ward observations" }, { status: 500 });
  }
}
