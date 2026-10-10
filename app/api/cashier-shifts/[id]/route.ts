import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashierShifts, payments, paymentItems, patients, users } from "@/lib/db/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requirePermission, hasAnyPermission } from "@/lib/authz";
import { shiftTotals } from "@/lib/billing/shifts";

// GET /api/cashier-shifts/[id] — one shift with every payment taken in it
// (the cash-up sheet). Cashiers can open their own; supervisors any.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission([["finance", "edit"], ["finance", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId } = authz.ctx;
    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid shift ID" }, { status: 400 });

    const reviewer = alias(users, "reviewer");
    const [row] = await db
      .select({
        shift: cashierShifts,
        cashierFirstname: users.firstname,
        cashierLastname: users.lastname,
        reviewerFirstname: reviewer.firstname,
        reviewerLastname: reviewer.lastname,
      })
      .from(cashierShifts)
      .leftJoin(users, eq(cashierShifts.userId, users.id))
      .leftJoin(reviewer, eq(cashierShifts.reviewedBy, reviewer.id))
      .where(and(eq(cashierShifts.id, id), eq(cashierShifts.organisationId, orgId)))
      .limit(1);
    if (!row) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    const supervisor = hasAnyPermission(authz.ctx, [["finance", "edit"]]);
    if (row.shift.userId !== userId && !supervisor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const pays = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        channel: payments.channel,
        posReference: payments.posReference,
        createdAt: payments.createdAt,
        patientFirstname: patients.firstname,
        patientLastname: patients.lastname,
        patientMrn: patients.mrn,
      })
      .from(payments)
      .leftJoin(patients, eq(payments.patientId, patients.id))
      .where(and(eq(payments.shiftId, id), eq(payments.status, "success")))
      .orderBy(asc(payments.createdAt));
    const items = pays.length
      ? await db.select({ paymentId: paymentItems.paymentId }).from(paymentItems).where(inArray(paymentItems.paymentId, pays.map((p) => p.id)))
      : [];
    const itemCount = new Map<number, number>();
    for (const i of items) itemCount.set(i.paymentId, (itemCount.get(i.paymentId) ?? 0) + 1);

    return NextResponse.json({
      ...row.shift,
      cashierName: `${row.cashierFirstname ?? ""} ${row.cashierLastname ?? ""}`.trim(),
      reviewerName: row.reviewerFirstname ? `${row.reviewerFirstname} ${row.reviewerLastname ?? ""}`.trim() : null,
      isMine: row.shift.userId === userId,
      canReview: supervisor && row.shift.userId !== userId,
      totals: await shiftTotals(db, id),
      payments: pays.map((p) => ({
        ...p,
        patientName: `${p.patientFirstname ?? ""} ${p.patientLastname ?? ""}`.trim(),
        items: itemCount.get(p.id) ?? 0,
      })),
    });
  } catch (error) {
    console.error("Error fetching shift:", error);
    return NextResponse.json({ error: "Failed to fetch shift" }, { status: 500 });
  }
}
