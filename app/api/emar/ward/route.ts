import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { CLINICAL_VIEW } from "@/lib/clinical/access";
import { wardMedicationSummary } from "@/lib/emar/chart";

// GET /api/emar/ward — doses due now / overdue per current admission.
export async function GET() {
  try {
    const authz = await requirePermission(CLINICAL_VIEW);
    if (authz.error) return authz.error;
    return NextResponse.json(await wardMedicationSummary(db, authz.ctx.orgId), { status: 200 });
  } catch (error) {
    console.error("Error fetching ward medication summary:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}
