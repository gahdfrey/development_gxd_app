import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cashierShifts, users } from "@/lib/db/schema";
import { and, desc, eq, gte, lt, inArray } from "drizzle-orm";
import { requirePermission, hasAnyPermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { getOpenShift, parseAmount, shiftTotals } from "@/lib/billing/shifts";

const DESK = [["finance", "edit"], ["finance", "add"]] as [string, string][];

// GET /api/cashier-shifts?from=YYYY-MM-DD&to=YYYY-MM-DD&userId=&status=
// Supervisors (finance edit) see every cashier's shifts; a cashier sees their own.
export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission(DESK);
    if (authz.error) return authz.error;
    const { orgId, userId } = authz.ctx;
    const supervisor = hasAnyPermission(authz.ctx, [["finance", "edit"]]);

    const sp = new URL(request.url).searchParams;
    const conditions = [eq(cashierShifts.organisationId, orgId)];
    const day = /^\d{4}-\d{2}-\d{2}$/;
    const from = sp.get("from");
    const to = sp.get("to");
    // Dates are WAT calendar days.
    if (from && day.test(from)) conditions.push(gte(cashierShifts.openedAt, new Date(`${from}T00:00:00+01:00`)));
    if (to && day.test(to)) {
      const end = new Date(`${to}T00:00:00+01:00`);
      end.setUTCDate(end.getUTCDate() + 1);
      conditions.push(lt(cashierShifts.openedAt, end));
    }
    const status = sp.get("status");
    if (status) conditions.push(inArray(cashierShifts.status, status.split(",")));
    if (!supervisor) conditions.push(eq(cashierShifts.userId, userId));
    else if (sp.get("userId")) conditions.push(eq(cashierShifts.userId, Number(sp.get("userId"))));

    const rows = await db
      .select({
        shift: cashierShifts,
        cashierFirstname: users.firstname,
        cashierLastname: users.lastname,
      })
      .from(cashierShifts)
      .leftJoin(users, eq(cashierShifts.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(cashierShifts.openedAt))
      .limit(200);

    // Open shifts have no snapshot yet — show their running takings.
    const result = await Promise.all(
      rows.map(async (r) => {
        const running = r.shift.status === "open" ? await shiftTotals(db, r.shift.id) : null;
        return {
          ...r.shift,
          cashierName: `${r.cashierFirstname ?? ""} ${r.cashierLastname ?? ""}`.trim(),
          isMine: r.shift.userId === userId,
          running,
        };
      }),
    );
    return NextResponse.json({ shifts: result, canReview: supervisor });
  } catch (error) {
    console.error("Error fetching cashier shifts:", error);
    return NextResponse.json({ error: "Failed to fetch shifts" }, { status: 500 });
  }
}

// POST /api/cashier-shifts — open my shift. Body: { openingFloat }
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission(DESK);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const body = await request.json();
    const openingFloat = parseAmount(body.openingFloat ?? 0);
    if (openingFloat == null) return NextResponse.json({ error: "Opening float must be a whole Naira amount" }, { status: 400 });

    if (await getOpenShift(db, orgId, userId)) {
      return NextResponse.json({ error: "You already have an open shift" }, { status: 409 });
    }
    const [shift] = await db
      .insert(cashierShifts)
      .values({ organisationId: orgId, userId, openingFloat })
      .onConflictDoNothing()
      .returning();
    if (!shift) return NextResponse.json({ error: "You already have an open shift" }, { status: 409 });

    void logAudit({ organisationId: orgId, userId, userEmail, action: "cashier_shift.open", entityType: "cashier_shift", entityId: shift.id, details: { openingFloat } });
    return NextResponse.json(shift, { status: 201 });
  } catch (error) {
    console.error("Error opening shift:", error);
    return NextResponse.json({ error: "Failed to open shift" }, { status: 500 });
  }
}
