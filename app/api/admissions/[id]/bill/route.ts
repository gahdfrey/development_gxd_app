import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { getAdmissionBill, syncBedDayCharges } from "@/lib/billing/admissionBill";

// GET /api/admissions/[id]/bill — the running inpatient bill (bed days are
// brought up to date first).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission([["finance", "view"], ["admission", "view"]]);
    if (authz.error) return authz.error;
    const { orgId, userId } = authz.ctx;
    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid admission" }, { status: 400 });
    await syncBedDayCharges(db, orgId, id, userId);
    const bill = await getAdmissionBill(db, orgId, id);
    if (!bill) return NextResponse.json({ error: "Admission not found" }, { status: 404 });
    return NextResponse.json(bill);
  } catch (error) {
    console.error("Error building admission bill:", error);
    return NextResponse.json({ error: "Failed to load bill" }, { status: 500 });
  }
}
