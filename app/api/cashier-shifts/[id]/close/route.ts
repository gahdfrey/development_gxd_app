import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashierShifts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermission, hasAnyPermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { parseAmount, shiftTotals } from "@/lib/billing/shifts";

/**
 * POST /api/cashier-shifts/[id]/close — cash-up.
 * Body: { countedCash, countedPos, countedTransfer, note? }
 * Expected cash is the opening float plus cash taken. If any channel doesn't
 * match, a note is required and the shift waits for a supervisor's sign-off.
 * A supervisor may also close a shift a cashier left open.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission([["finance", "edit"], ["finance", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid shift ID" }, { status: 400 });

    const body = await request.json();
    const counted = {
      cash: parseAmount(body.countedCash),
      pos: parseAmount(body.countedPos ?? 0),
      transfer: parseAmount(body.countedTransfer ?? 0),
    };
    if (counted.cash == null || counted.pos == null || counted.transfer == null) {
      return NextResponse.json({ error: "Enter each counted amount in whole Naira" }, { status: 400 });
    }
    const note = typeof body.note === "string" ? body.note.trim() : "";

    const result = await db.transaction(async (tx) => {
      const [shift] = await tx
        .select()
        .from(cashierShifts)
        .where(and(eq(cashierShifts.id, id), eq(cashierShifts.organisationId, orgId)))
        .for("update")
        .limit(1);
      if (!shift) return { error: "Shift not found", status: 404 } as const;
      if (shift.status !== "open") return { error: "This shift is already closed", status: 409 } as const;
      if (shift.userId !== userId && !hasAnyPermission(authz.ctx, [["finance", "edit"]])) {
        return { error: "Only the cashier or a finance supervisor can close this shift", status: 403 } as const;
      }

      const t = await shiftTotals(tx, id);
      const expected = { cash: shift.openingFloat + t.cash, pos: t.pos, transfer: t.transfer };
      const diff = {
        cash: counted.cash! - expected.cash,
        pos: counted.pos! - expected.pos,
        transfer: counted.transfer! - expected.transfer,
      };
      const balanced = diff.cash === 0 && diff.pos === 0 && diff.transfer === 0;
      if (!balanced && !note) {
        return { error: "The count doesn't match. Explain the difference before closing.", status: 400, code: "NOTE_REQUIRED", expected, diff } as const;
      }

      const [closed] = await tx
        .update(cashierShifts)
        .set({
          status: balanced ? "closed" : "pending_review",
          closedAt: new Date(),
          expectedCash: expected.cash,
          expectedPos: expected.pos,
          expectedTransfer: expected.transfer,
          countedCash: counted.cash,
          countedPos: counted.pos,
          countedTransfer: counted.transfer,
          variance: diff.cash + diff.pos + diff.transfer,
          closeNote: note || null,
          updatedAt: new Date(),
        })
        .where(eq(cashierShifts.id, id))
        .returning();
      return { shift: closed, expected, diff, closedByOther: shift.userId !== userId } as const;
    });

    if ("error" in result) {
      const { error, status, ...rest } = result;
      return NextResponse.json({ error, ...rest }, { status });
    }

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "cashier_shift.close",
      entityType: "cashier_shift",
      entityId: id,
      details: { expected: result.expected, counted, diff: result.diff, note: note || null, closedByOther: result.closedByOther },
    });
    return NextResponse.json(result.shift);
  } catch (error) {
    console.error("Error closing shift:", error);
    return NextResponse.json({ error: "Failed to close shift" }, { status: 500 });
  }
}
