import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientReferrals, referrers, requests } from "@/lib/db/schema";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { parseDateRangeParams } from "@/lib/dateRange";
import { dateRangeCondition } from "@/lib/dateRangeQuery";

/**
 * GET /api/referrals/referrers?startDate=&endDate= — the Referral module's
 * "By referrer" tab: every referrer with how many patients they referred,
 * the total billed for those tests and the amount owed to them — only for
 * tests the patient has paid for; unpaid tests show as pending. Deleted
 * referrers still show while they have referrals, so nothing owed is hidden.
 */
export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission([["referral", "view"]]);
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const { range, error } = parseDateRangeParams(new URL(request.url).searchParams);
    if (error) return NextResponse.json({ error }, { status: 400 });

    const rows = await db
      .select({
        id: referrers.id,
        code: referrers.code,
        name: referrers.name,
        bank: referrers.bank,
        accountNumber: referrers.accountNumber,
        whatsappNumber: referrers.whatsappNumber,
        deletedAt: referrers.deletedAt,
        patientCount: sql<number>`count(distinct ${patientReferrals.patientId})::int`,
        testCount: sql<number>`count(${patientReferrals.id})::int`,
        totalAmount: sql<number>`coalesce(sum(${patientReferrals.amount}), 0)::int`,
        amountOwed: sql<number>`coalesce(sum(${patientReferrals.discountAmount}) filter (where ${requests.paymentStatus} = 'paid'), 0)::int`,
        pendingAmount: sql<number>`coalesce(sum(${patientReferrals.discountAmount}) filter (where ${requests.paymentStatus} = 'not_paid'), 0)::int`,
      })
      .from(referrers)
      .leftJoin(
        patientReferrals,
        and(
          eq(patientReferrals.referrerId, referrers.id),
          isNull(patientReferrals.deletedAt),
          dateRangeCondition(patientReferrals.createdAt, range),
        ),
      )
      .leftJoin(requests, eq(patientReferrals.requestId, requests.id))
      .where(eq(referrers.organisationId, orgId))
      .groupBy(referrers.id)
      .orderBy(asc(referrers.name));

    return NextResponse.json(
      rows.filter((r) => !r.deletedAt || r.testCount > 0),
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching referrer summary:", error);
    return NextResponse.json({ error: "Failed to fetch referrers" }, { status: 500 });
  }
}
