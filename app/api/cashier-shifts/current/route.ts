import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/authz";
import { getOpenShift, shiftTotals } from "@/lib/billing/shifts";

// GET /api/cashier-shifts/current — my open shift (or null) with running takings.
export async function GET() {
  try {
    const authz = await requirePermission([["finance", "edit"], ["finance", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId } = authz.ctx;
    const shift = await getOpenShift(db, orgId, userId);
    if (!shift) return NextResponse.json({ shift: null });
    return NextResponse.json({ shift, totals: await shiftTotals(db, shift.id) });
  } catch (error) {
    console.error("Error fetching current shift:", error);
    return NextResponse.json({ error: "Failed to fetch shift" }, { status: 500 });
  }
}
