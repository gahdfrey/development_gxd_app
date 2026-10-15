import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientReferrals, patients, referrers, requests } from "@/lib/db/schema";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { parseDateRangeParams } from "@/lib/dateRange";
import { dateRangeCondition } from "@/lib/dateRangeQuery";

/**
 * GET /api/referrals/patients?search=&startDate=&endDate= — the Referral
 * module's "By patient" tab: one row per referred patient with who referred
 * them, the tests, the total billed and the referrer discount — owed only on
 * tests the patient has paid for, pending on the rest.
 */
export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission([["referral", "view"]]);
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const { searchParams } = new URL(request.url);
    const { range, error } = parseDateRangeParams(searchParams);
    if (error) return NextResponse.json({ error }, { status: 400 });
    const search = searchParams.get("search")?.trim();
    const like = search ? `%${search}%` : null;

    const rows = await db
      .select({
        patientId: patients.id,
        firstname: patients.firstname,
        lastname: patients.lastname,
        mrn: patients.mrn,
        registeredAt: patients.createdAt,
        referrerId: referrers.id,
        referrerName: referrers.name,
        referrerCode: referrers.code,
        tests: sql<string>`string_agg(${patientReferrals.testName}, ', ' ORDER BY ${patientReferrals.id})`,
        totalAmount: sql<number>`coalesce(sum(${patientReferrals.amount}), 0)::int`,
        amountOwed: sql<number>`coalesce(sum(${patientReferrals.discountAmount}) filter (where ${requests.paymentStatus} = 'paid'), 0)::int`,
        pendingAmount: sql<number>`coalesce(sum(${patientReferrals.discountAmount}) filter (where ${requests.paymentStatus} = 'not_paid'), 0)::int`,
        testCount: sql<number>`count(${patientReferrals.id})::int`,
        paidCount: sql<number>`(count(${patientReferrals.id}) filter (where ${requests.paymentStatus} = 'paid'))::int`,
      })
      .from(patientReferrals)
      .innerJoin(patients, eq(patientReferrals.patientId, patients.id))
      .innerJoin(referrers, eq(patientReferrals.referrerId, referrers.id))
      .leftJoin(requests, eq(patientReferrals.requestId, requests.id))
      .where(and(
        eq(patientReferrals.organisationId, orgId),
        isNull(patientReferrals.deletedAt),
        isNull(patients.deletedAt),
        dateRangeCondition(patientReferrals.createdAt, range),
        like
          ? or(
              ilike(sql`${patients.firstname} || ' ' || ${patients.lastname}`, like),
              ilike(patients.mrn, like),
              ilike(referrers.name, like),
              ilike(referrers.code, like),
            )
          : undefined,
      ))
      .groupBy(patients.id, referrers.id)
      .orderBy(desc(patients.createdAt));

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("Error fetching referred patients:", error);
    return NextResponse.json({ error: "Failed to fetch referred patients" }, { status: 500 });
  }
}
