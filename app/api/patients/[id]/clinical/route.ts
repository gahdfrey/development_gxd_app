import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { CLINICAL_VIEW } from "@/lib/clinical/access";
import { getClinicalSummary } from "@/lib/clinical/summary";

// GET /api/patients/[id]/clinical — allergies, problem list and weight/height.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission(CLINICAL_VIEW);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });

    const summary = await getClinicalSummary(db, orgId, id);
    if (!summary) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error("Error fetching clinical summary:", error);
    return NextResponse.json({ error: "Failed to fetch clinical summary" }, { status: 500 });
  }
}
