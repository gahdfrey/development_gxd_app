import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, roles } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthContext } from "@/lib/authz";

/**
 * GET /api/greeting — data for the post-login welcome banner: the user's
 * courtesy title + name, and a few role-relevant preview stats. The
 * time-of-day greeting and holiday are computed client-side (from the
 * viewer's local clock).
 */
export async function GET() {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [u] = await db
      .select({
        firstname: users.firstname,
        lastname: users.lastname,
        gender: users.gender,
        departmentId: users.departmentId,
        roleName: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, ctx.userId))
      .limit(1);

    if (!u) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const role = (u.roleName ?? "").toLowerCase();
    const gender = (u.gender ?? "").toLowerCase();

    // Courtesy title: Dr / Nr by profession, else Mr / Mrs by gender.
    let title = "";
    if (role.includes("doctor")) title = "Dr";
    else if (role.includes("nurse")) title = "Nr";
    else if (gender === "male") title = "Mr";
    else if (gender === "female") title = "Mrs";

    const orgId = ctx.orgId;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const num = async (q: any): Promise<number> => {
      const rows = (await db.execute(q)) as unknown as { n: number }[];
      return rows[0]?.n ?? 0;
    };
    const today = sql`to_char((now() AT TIME ZONE 'Africa/Lagos'), 'YYYY-MM-DD')`;
    const plural = (n: number) => (n === 1 ? "" : "s");
    const previews: string[] = [];

    if (ctx.patientId) {
      // ── Patient portal ─────────────────────────────────────────────────
      const upcoming = await num(sql`
        SELECT count(*)::int AS n FROM appointments
        WHERE patient_id = ${ctx.patientId} AND status = 'scheduled'
          AND appointment_date >= ${today}`);
      const results = await num(sql`
        SELECT count(*)::int AS n FROM request_results rr
        JOIN requests r ON rr.request_id = r.id
        WHERE r.patient_id = ${ctx.patientId} AND rr.created_at >= now() - interval '14 days'`);
      if (upcoming) previews.push(`You have ${upcoming} upcoming appointment${plural(upcoming)}.`);
      if (results) previews.push(`${results} new test result${plural(results)} available.`);
    } else if (role.includes("doctor")) {
      // ── Doctor ─────────────────────────────────────────────────────────
      const appts = await num(sql`
        SELECT count(*)::int AS n FROM appointments
        WHERE organisation_id = ${orgId} AND doctor_id = ${ctx.userId}
          AND appointment_date = ${today} AND status = 'scheduled'`);
      const results = await num(sql`
        SELECT count(*)::int AS n FROM request_results rr
        JOIN requests r ON rr.request_id = r.id
        WHERE r.organisation_id = ${orgId} AND r.requested_by = ${ctx.userId}
          AND rr.created_at >= now() - interval '7 days'`);
      if (appts) previews.push(`You have ${appts} appointment${plural(appts)} scheduled today.`);
      if (results) previews.push(`${results} test result${plural(results)} ready to review.`);
    } else if (role.includes("lab") || role.includes("radio")) {
      // ── Lab / Radiology ────────────────────────────────────────────────
      const pending = u.departmentId
        ? await num(sql`
            SELECT count(*)::int AS n FROM requests
            WHERE organisation_id = ${orgId} AND department_id = ${u.departmentId}
              AND status = 'pending' AND payment_status = 'paid'`)
        : 0;
      if (pending) previews.push(`${pending} test${plural(pending)} awaiting your results.`);
    } else if (role.includes("finance")) {
      // ── Finance ────────────────────────────────────────────────────────
      const unpaid = await num(sql`
        SELECT (
          (SELECT count(*) FROM requests WHERE organisation_id = ${orgId} AND payment_status = 'not_paid')
          + (SELECT count(*) FROM prescriptions WHERE organisation_id = ${orgId} AND payment_status = 'not_paid')
        )::int AS n`);
      if (unpaid) previews.push(`${unpaid} payment${plural(unpaid)} pending collection.`);
    } else if (role.includes("pharmac")) {
      // ── Pharmacy ───────────────────────────────────────────────────────
      const toDispense = await num(sql`
        SELECT count(*)::int AS n FROM prescriptions
        WHERE organisation_id = ${orgId} AND status = 'pending' AND payment_status = 'paid'`);
      if (toDispense) previews.push(`${toDispense} prescription${plural(toDispense)} ready to dispense.`);
    } else {
      // ── Admin / front desk / everyone else ─────────────────────────────
      const appts = await num(sql`
        SELECT count(*)::int AS n FROM appointments
        WHERE organisation_id = ${orgId} AND appointment_date = ${today}`);
      const newPatients = await num(sql`
        SELECT count(*)::int AS n FROM patients
        WHERE organisation_id = ${orgId} AND deleted_at IS NULL
          AND created_at >= now() - interval '7 days'`);
      if (appts) previews.push(`${appts} appointment${plural(appts)} across the facility today.`);
      if (newPatients) previews.push(`${newPatients} new patient${plural(newPatients)} registered this week.`);
    }

    return NextResponse.json({
      title,
      firstname: u.firstname,
      lastname: u.lastname,
      previews,
    });
  } catch (error) {
    console.error("Error building greeting:", error);
    return NextResponse.json({ error: "Failed to build greeting" }, { status: 500 });
  }
}
