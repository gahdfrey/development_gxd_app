import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { differenceInCalendarMonths, parse, subMonths } from "date-fns";
import { requirePermission } from "@/lib/authz";
import { parseDateRangeParams, toDateString } from "@/lib/dateRange";
import { andDateRange } from "@/lib/dateRangeQuery";

const MAX_TREND_MONTHS = 24;

/**
 * GET /api/analytics — facility-level aggregate metrics for the dashboard.
 * All figures are scoped to the caller's organisation. This is operational
 * analytics for the facility's own admins (not the privacy-preserving national
 * aggregation the NDHA describes).
 *
 * Optional `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD` (inclusive) scopes the
 * figures to records created in that period. Low stock, "today" and "this
 * month" counts are point-in-time and ignore the range. Trend charts cover the
 * range month-by-month (last 6 months when unfiltered, capped at 24).
 */
export async function GET(req: NextRequest) {
  try {
    const authz = await requirePermission([["analytics", "view"]]);
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const { range, error: rangeError } = parseDateRangeParams(req.nextUrl.searchParams);
    if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });
    // `AND <col> in range` (or nothing) for the raw queries below.
    const R = (column: string) => andDateRange(column, range);

    // Month buckets for the trend charts.
    const asDate = (s: string) => parse(s, "yyyy-MM-dd", new Date());
    const trendEnd = range?.endDate ? asDate(range.endDate) : new Date();
    let trendStart = range?.startDate ? asDate(range.startDate) : subMonths(trendEnd, 5);
    if (differenceInCalendarMonths(trendEnd, trendStart) >= MAX_TREND_MONTHS) {
      trendStart = subMonths(trendEnd, MAX_TREND_MONTHS - 1);
    }
    const monthLabel =
      trendStart.getFullYear() === trendEnd.getFullYear() ? "Mon" : "Mon YY";
    const months = sql`
      WITH months AS (
        SELECT generate_series(
          date_trunc('month', ${toDateString(trendStart)}::date),
          date_trunc('month', ${toDateString(trendEnd)}::date),
          '1 month'::interval
        ) AS m
      )`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = async (q: any) => (await db.execute(q)) as unknown as any[];

    const [
      totals,
      apptByStatus,
      patientsByGender,
      patientsByInsurance,
      requestsByDept,
      rxByStatus,
      topDiagnoses,
      topMeds,
      monthlyActivity,
      monthlyRevenue,
      lowStock,
      operational,
    ] = await Promise.all([
      // ── Headline totals ──────────────────────────────────────────────────
      rows(sql`
        SELECT
          (SELECT count(*) FROM patients WHERE organisation_id = ${orgId} AND deleted_at IS NULL ${R("created_at")})::int AS patients,
          (SELECT count(*) FROM appointments WHERE organisation_id = ${orgId} ${R("created_at")})::int AS appointments,
          (SELECT count(*) FROM visits WHERE organisation_id = ${orgId} ${R("created_at")})::int AS visits,
          (SELECT count(*) FROM requests WHERE organisation_id = ${orgId} ${R("created_at")})::int AS requests,
          (SELECT count(*) FROM prescriptions WHERE organisation_id = ${orgId} ${R("created_at")})::int AS prescriptions,
          (SELECT count(*) FROM patients WHERE organisation_id = ${orgId} AND deleted_at IS NULL
             AND created_at >= date_trunc('month', now()))::int AS patients_this_month
      `),
      // ── Appointments by status ───────────────────────────────────────────
      rows(sql`
        SELECT status, count(*)::int AS value
        FROM appointments WHERE organisation_id = ${orgId} ${R("created_at")}
        GROUP BY status ORDER BY value DESC
      `),
      // ── Patients by gender (normalise casing) ────────────────────────────
      rows(sql`
        SELECT initcap(gender) AS gender, count(*)::int AS value
        FROM patients WHERE organisation_id = ${orgId} AND deleted_at IS NULL ${R("created_at")}
        GROUP BY initcap(gender) ORDER BY value DESC
      `),
      // ── Patients by insurance type ───────────────────────────────────────
      rows(sql`
        SELECT insurance_type AS label, count(*)::int AS value
        FROM patients WHERE organisation_id = ${orgId} AND deleted_at IS NULL ${R("created_at")}
        GROUP BY insurance_type ORDER BY value DESC
      `),
      // ── Requests by department ───────────────────────────────────────────
      rows(sql`
        SELECT d.name AS label, count(*)::int AS value
        FROM requests r LEFT JOIN departments d ON r.department_id = d.id
        WHERE r.organisation_id = ${orgId} ${R("r.created_at")}
        GROUP BY d.name ORDER BY value DESC
      `),
      // ── Prescriptions by status ──────────────────────────────────────────
      rows(sql`
        SELECT status, count(*)::int AS value
        FROM prescriptions WHERE organisation_id = ${orgId} ${R("created_at")}
        GROUP BY status ORDER BY value DESC
      `),
      // ── Top ICD-11 diagnoses ─────────────────────────────────────────────
      rows(sql`
        SELECT COALESCE(icd_title, clinical_text) AS label, icd_code AS code, count(*)::int AS value
        FROM visit_diagnoses WHERE organisation_id = ${orgId} ${R("created_at")}
        GROUP BY 1, 2 ORDER BY value DESC LIMIT 8
      `),
      // ── Top prescribed medications ───────────────────────────────────────
      rows(sql`
        SELECT p.name AS label, count(*)::int AS value
        FROM prescriptions pr LEFT JOIN products p ON pr.product_id = p.id
        WHERE pr.organisation_id = ${orgId} ${R("pr.created_at")}
        GROUP BY p.name ORDER BY value DESC LIMIT 8
      `),
      // ── Monthly activity (trend window) ───────────────────────────────────
      rows(sql`
        ${months}
        SELECT
          to_char(m, ${monthLabel}) AS month,
          (SELECT count(*) FROM appointments a WHERE a.organisation_id = ${orgId}
             AND date_trunc('month', a.created_at) = months.m ${R("a.created_at")})::int AS appointments,
          (SELECT count(*) FROM patients p WHERE p.organisation_id = ${orgId} AND p.deleted_at IS NULL
             AND date_trunc('month', p.created_at) = months.m ${R("p.created_at")})::int AS patients
        FROM months ORDER BY m ASC
      `),
      // ── Monthly revenue (paid requests + paid prescriptions + subscription
      // charges — wallet top-ups are excluded, they're not revenue until
      // spent; items settled via plan coverage (payment_items.method='plan')
      // are also excluded from the requests/prescriptions sums since their
      // value was already counted once as the subscription charge that
      // funds the coverage — counting both would double-count the same
      // money) ──────────────────────────────────────────────────────────────
      rows(sql`
        ${months}
        SELECT
          to_char(m, ${monthLabel}) AS month,
          (COALESCE((SELECT sum(t.price) FROM requests r JOIN lab_tests t ON r.test_id = t.id
             WHERE r.organisation_id = ${orgId} AND r.payment_status = 'paid'
             AND date_trunc('month', r.updated_at) = months.m ${R("r.updated_at")}
             AND NOT EXISTS (SELECT 1 FROM payment_items pi JOIN payments pay ON pi.payment_id = pay.id
               WHERE pi.item_type = 'request' AND pi.item_id = r.id AND pay.method = 'plan')), 0)
           + COALESCE((SELECT sum(p.price) FROM prescriptions pr JOIN products p ON pr.product_id = p.id
             WHERE pr.organisation_id = ${orgId} AND pr.payment_status = 'paid'
             AND date_trunc('month', pr.updated_at) = months.m ${R("pr.updated_at")}
             AND NOT EXISTS (SELECT 1 FROM payment_items pi JOIN payments pay ON pi.payment_id = pay.id
               WHERE pi.item_type = 'prescription' AND pi.item_id = pr.id AND pay.method = 'plan')), 0)
           + COALESCE((SELECT sum(pay.amount) FROM payments pay
             WHERE pay.organisation_id = ${orgId} AND pay.status = 'success' AND pay.purpose = 'subscription_charge'
             AND date_trunc('month', pay.created_at) = months.m ${R("pay.created_at")}), 0))::int AS revenue
        FROM months ORDER BY m ASC
      `),
      // ── Low-stock products ───────────────────────────────────────────────
      rows(sql`
        SELECT name,
          (cases_in_stock * units_per_case + loose_units_in_stock)::int AS total_units,
          reorder_level::int AS reorder_level
        FROM products
        WHERE organisation_id = ${orgId} AND deleted_at IS NULL
          AND (cases_in_stock * units_per_case + loose_units_in_stock) <= reorder_level
        ORDER BY total_units ASC LIMIT 10
      `),
      // ── Operational counts ───────────────────────────────────────────────
      rows(sql`
        SELECT
          (SELECT count(*) FROM requests WHERE organisation_id = ${orgId} AND status = 'pending' ${R("created_at")})::int AS pending_requests,
          (SELECT count(*) FROM requests WHERE organisation_id = ${orgId} AND payment_status = 'not_paid' ${R("created_at")})::int AS unpaid_requests,
          (SELECT count(*) FROM request_results rr JOIN requests r ON rr.request_id = r.id
             WHERE r.organisation_id = ${orgId} ${R("rr.created_at")})::int AS results_received,
          (SELECT count(*) FROM appointments WHERE organisation_id = ${orgId}
             AND appointment_date = to_char(now(), 'YYYY-MM-DD'))::int AS appts_today,
          COALESCE((SELECT sum(t.price) FROM requests r JOIN lab_tests t ON r.test_id = t.id
             WHERE r.organisation_id = ${orgId} AND r.payment_status = 'paid' ${R("r.updated_at")}
             AND NOT EXISTS (SELECT 1 FROM payment_items pi JOIN payments pay ON pi.payment_id = pay.id
               WHERE pi.item_type = 'request' AND pi.item_id = r.id AND pay.method = 'plan')), 0)::int AS revenue_requests,
          COALESCE((SELECT sum(p.price) FROM prescriptions pr JOIN products p ON pr.product_id = p.id
             WHERE pr.organisation_id = ${orgId} AND pr.payment_status = 'paid' ${R("pr.updated_at")}
             AND NOT EXISTS (SELECT 1 FROM payment_items pi JOIN payments pay ON pi.payment_id = pay.id
               WHERE pi.item_type = 'prescription' AND pi.item_id = pr.id AND pay.method = 'plan')), 0)::int AS revenue_rx,
          COALESCE((SELECT sum(pay.amount) FROM payments pay
             WHERE pay.organisation_id = ${orgId} AND pay.status = 'success' AND pay.purpose = 'subscription_charge' ${R("pay.created_at")}), 0)::int AS revenue_subscriptions
      `),
    ]);

    const op = operational[0] ?? {};
    const t = totals[0] ?? {};

    return NextResponse.json({
      totals: {
        patients: t.patients ?? 0,
        appointments: t.appointments ?? 0,
        visits: t.visits ?? 0,
        requests: t.requests ?? 0,
        prescriptions: t.prescriptions ?? 0,
        patientsThisMonth: t.patients_this_month ?? 0,
        apptsToday: op.appts_today ?? 0,
        revenue: (op.revenue_requests ?? 0) + (op.revenue_rx ?? 0) + (op.revenue_subscriptions ?? 0),
        pendingRequests: op.pending_requests ?? 0,
        unpaidRequests: op.unpaid_requests ?? 0,
        resultsReceived: op.results_received ?? 0,
      },
      apptByStatus,
      patientsByGender,
      patientsByInsurance,
      requestsByDept,
      rxByStatus,
      topDiagnoses,
      topMeds,
      monthlyActivity,
      monthlyRevenue,
      lowStock,
    });
  } catch (error) {
    console.error("Error building analytics:", error);
    return NextResponse.json({ error: "Failed to build analytics" }, { status: 500 });
  }
}
