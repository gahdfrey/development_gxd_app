import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashierShifts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

/**
 * POST /api/cashier-shifts/[id]/review — a finance supervisor signs off a
 * shift whose count didn't match. Body: { note }. The cashier can't sign
 * off their own shift.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission([["finance", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid shift ID" }, { status: 400 });

    const body = await request.json();
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!note) return NextResponse.json({ error: "Record what was decided about the difference" }, { status: 400 });

    const [shift] = await db
      .select()
      .from(cashierShifts)
      .where(and(eq(cashierShifts.id, id), eq(cashierShifts.organisationId, orgId)))
      .limit(1);
    if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    if (shift.userId === userId) return NextResponse.json({ error: "Another supervisor must sign off your own shift" }, { status: 403 });
    if (shift.status !== "pending_review") return NextResponse.json({ error: "This shift isn't awaiting sign-off" }, { status: 409 });

    const [reviewed] = await db
      .update(cashierShifts)
      .set({ status: "reviewed", reviewedBy: userId, reviewedAt: new Date(), reviewNote: note, updatedAt: new Date() })
      .where(and(eq(cashierShifts.id, id), eq(cashierShifts.status, "pending_review")))
      .returning();
    if (!reviewed) return NextResponse.json({ error: "This shift isn't awaiting sign-off" }, { status: 409 });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "cashier_shift.review",
      entityType: "cashier_shift",
      entityId: id,
      details: { variance: shift.variance, note, cashierId: shift.userId },
    });
    return NextResponse.json(reviewed);
  } catch (error) {
    console.error("Error reviewing shift:", error);
    return NextResponse.json({ error: "Failed to sign off shift" }, { status: 500 });
  }
}
