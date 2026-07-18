import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";

/**
 * GET /api/analytics — facility-level aggregate metrics for the dashboard.
 * All figures are scoped to the caller's organisation. This is operational
 * analytics for the facility's own admins (not the privacy-preserving national
 * aggregation the NDHA describes).
 */
export async function GET() {
  try {
    const authz = await requirePermission([["analytics", "view"]]);
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

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
          (SELECT count(*) FROM patients WHERE organisation_id = ${orgId} AND deleted_at IS NULL)::int AS patients,
          (SELECT count(*) FROM appointments WHERE organisation_id = ${orgId})::int AS appointments,
          (SELECT count(*) FROM visits WHERE organisation_id = ${orgId})::int AS visits,
          (SELECT count(*) FROM requests WHERE organisation_id = ${orgId})::int AS requests,
          (SELECT count(*) FROM prescriptions WHERE organisation_id = ${orgId})::int AS prescriptions,
          (SELECT count(*) FROM patients WHERE organisation_id = ${orgId} AND deleted_at IS NULL
             AND created_at >= date_trunc('month', now()))::int AS patients_this_month
      `),
      // ── Appointments by status ───────────────────────────────────────────
      rows(sql`
        SELECT status, count(*)::int AS value
        FROM appointments WHERE organisation_id = ${orgId}
        GROUP BY status ORDER BY value DESC
      `),
      // ── Patients by gender (normalise casing) ────────────────────────────
      rows(sql`
        SELECT initcap(gender) AS gender, count(*)::int AS value
        FROM patients WHERE organisation_id = ${orgId} AND deleted_at IS NULL
        GROUP BY initcap(gender) ORDER BY value DESC
      `),
      // ── Patients by insurance type ───────────────────────────────────────
      rows(sql`
        SELECT insurance_type AS label, count(*)::int AS value
        FROM patients WHERE organisation_id = ${orgId} AND deleted_at IS NULL
        GROUP BY insurance_type ORDER BY value DESC
      `),
      // ── Requests by department ───────────────────────────────────────────
      rows(sql`
        SELECT d.name AS label, count(*)::int AS value
        FROM requests r LEFT JOIN departments d ON r.department_id = d.id
        WHERE r.organisation_id = ${orgId}
        GROUP BY d.name ORDER BY value DESC
      `),
      // ── Prescriptions by status ──────────────────────────────────────────
      rows(sql`
        SELECT status, count(*)::int AS value
        FROM prescriptions WHERE organisation_id = ${orgId}
        GROUP BY status ORDER BY value DESC
      `),
      // ── Top ICD-11 diagnoses ─────────────────────────────────────────────
      rows(sql`
        SELECT COALESCE(icd_title, clinical_text) AS label, icd_code AS code, count(*)::int AS value
        FROM visit_diagnoses WHERE organisation_id = ${orgId}
        GROUP BY 1, 2 ORDER BY value DESC LIMIT 8
      `),
      // ── Top prescribed medications ───────────────────────────────────────
      rows(sql`
        SELECT p.name AS label, count(*)::int AS value
        FROM prescriptions pr LEFT JOIN products p ON pr.product_id = p.id
        WHERE pr.organisation_id = ${orgId}
        GROUP BY p.name ORDER BY value DESC LIMIT 8
      `),
      // ── Monthly activity (last 6 months) ─────────────────────────────────
      rows(sql`
        WITH months AS (
          SELECT date_trunc('month', now()) - (n || ' month')::interval AS m
          FROM generate_series(0, 5) AS n
        )
        SELECT
          to_char(m, 'Mon') AS month,
          (SELECT count(*) FROM appointments a WHERE a.organisation_id = ${orgId}
             AND date_trunc('month', a.created_at) = months.m)::int AS appointments,
          (SELECT count(*) FROM patients p WHERE p.organisation_id = ${orgId} AND p.deleted_at IS NULL
             AND date_trunc('month', p.created_at) = months.m)::int AS patients
        FROM months ORDER BY m ASC
      `),
      // ── Monthly revenue (paid requests + paid prescriptions) ─────────────
      rows(sql`
        WITH months AS (
          SELECT date_trunc('month', now()) - (n || ' month')::interval AS m
          FROM generate_series(0, 5) AS n
        )
        SELECT
          to_char(m, 'Mon') AS month,
          (COALESCE((SELECT sum(t.price) FROM requests r JOIN lab_tests t ON r.test_id = t.id
             WHERE r.organisation_id = ${orgId} AND r.payment_status = 'paid'
             AND date_trunc('month', r.updated_at) = months.m), 0)
           + COALESCE((SELECT sum(p.price) FROM prescriptions pr JOIN products p ON pr.product_id = p.id
             WHERE pr.organisation_id = ${orgId} AND pr.payment_status = 'paid'
             AND date_trunc('month', pr.updated_at) = months.m), 0))::int AS revenue
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
          (SELECT count(*) FROM requests WHERE organisation_id = ${orgId} AND status = 'pending')::int AS pending_requests,
          (SELECT count(*) FROM requests WHERE organisation_id = ${orgId} AND payment_status = 'not_paid')::int AS unpaid_requests,
          (SELECT count(*) FROM request_results rr JOIN requests r ON rr.request_id = r.id
             WHERE r.organisation_id = ${orgId})::int AS results_received,
          (SELECT count(*) FROM appointments WHERE organisation_id = ${orgId}
             AND appointment_date = to_char(now(), 'YYYY-MM-DD'))::int AS appts_today,
          COALESCE((SELECT sum(t.price) FROM requests r JOIN lab_tests t ON r.test_id = t.id
             WHERE r.organisation_id = ${orgId} AND r.payment_status = 'paid'), 0)::int AS revenue_requests,
          COALESCE((SELECT sum(p.price) FROM prescriptions pr JOIN products p ON pr.product_id = p.id
             WHERE pr.organisation_id = ${orgId} AND pr.payment_status = 'paid'), 0)::int AS revenue_rx
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
        revenue: (op.revenue_requests ?? 0) + (op.revenue_rx ?? 0),
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
