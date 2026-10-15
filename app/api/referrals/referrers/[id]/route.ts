import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { departments, organisations, patientReferrals, patients, referrers, requests } from "@/lib/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { parseDateRangeParams } from "@/lib/dateRange";
import { dateRangeCondition } from "@/lib/dateRangeQuery";

/**
 * GET /api/referrals/referrers/[id]?startDate=&endDate= — one referrer's
 * statement: every test done for a patient they referred, with the amount
 * and the referrer's discount, plus the totals. A referrer is only owed the
 * discount on tests the patient has paid for (the linked request is "paid");
 * unpaid tests count as pending, waived tests never count.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["referral", "view"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid referrer ID" }, { status: 400 });

    const { range, error } = parseDateRangeParams(new URL(request.url).searchParams);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const [referrer] = await db
      .select()
      .from(referrers)
      .where(and(eq(referrers.id, id), eq(referrers.organisationId, orgId)))
      .limit(1);
    if (!referrer) return NextResponse.json({ error: "Referrer not found" }, { status: 404 });

    const [org] = await db
      .select({ name: organisations.name, address: organisations.address, phone: organisations.phone })
      .from(organisations)
      .where(eq(organisations.id, orgId))
      .limit(1);

    const lines = await db
      .select({
        id: patientReferrals.id,
        patientId: patients.id,
        firstname: patients.firstname,
        lastname: patients.lastname,
        mrn: patients.mrn,
        registeredAt: patients.createdAt,
        testName: patientReferrals.testName,
        departmentName: departments.name,
        amount: patientReferrals.amount,
        discountType: patientReferrals.discountType,
        discountValue: patientReferrals.discountValue,
        discountAmount: patientReferrals.discountAmount,
        paymentStatus: requests.paymentStatus,
      })
      .from(patientReferrals)
      .innerJoin(patients, eq(patientReferrals.patientId, patients.id))
      .leftJoin(departments, eq(patientReferrals.departmentId, departments.id))
      .leftJoin(requests, eq(patientReferrals.requestId, requests.id))
      .where(and(
        eq(patientReferrals.referrerId, id),
        eq(patientReferrals.organisationId, orgId),
        isNull(patientReferrals.deletedAt),
        dateRangeCondition(patientReferrals.createdAt, range),
      ))
      .orderBy(asc(patients.createdAt), asc(patientReferrals.id));

    const totals = {
      patients: new Set(lines.map((l) => l.patientId)).size,
      tests: lines.length,
      amount: lines.reduce((s, l) => s + l.amount, 0),
      amountOwed: lines.reduce((s, l) => s + (l.paymentStatus === "paid" ? l.discountAmount : 0), 0),
      pendingAmount: lines.reduce((s, l) => s + (l.paymentStatus === "not_paid" ? l.discountAmount : 0), 0),
      paidTests: lines.filter((l) => l.paymentStatus === "paid").length,
    };

    // Statement shows patient names: audit the read (HIPAA access logging).
    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "read",
      entityType: "referrer_statement",
      entityId: id,
      details: { range, lines: lines.length },
    });

    return NextResponse.json({ organisation: org ?? null, referrer, lines, totals }, { status: 200 });
  } catch (error) {
    console.error("Error fetching referrer statement:", error);
    return NextResponse.json({ error: "Failed to fetch referrer statement" }, { status: 500 });
  }
}
