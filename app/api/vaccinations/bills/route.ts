import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientCharges, patients, vaccinationCourses, vaccinationDoses, vaccines } from "@/lib/db/schema";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { describePeriod } from "@/lib/vaccination";

/**
 * GET /api/vaccinations/bills?status=unpaid|paid|all&search= — Finance →
 * Vaccinations: one row per vaccination course with what it costs, what's
 * been paid and what's outstanding (cancelled doses excluded).
 */
export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission([["finance", "view"]]);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;
    const params = new URL(request.url).searchParams;
    const status = params.get("status") ?? "unpaid";
    const search = params.get("search")?.trim();

    const d = vaccinationDoses;
    const c = patientCharges;
    const amount = sql`${c.unitPrice} * ${c.quantity}`;
    const billed = sql`${c.id} IS NOT NULL AND ${d.status} <> 'cancelled'`;
    const total = sql<number>`coalesce(sum(${amount}) filter (where ${billed}), 0)`;
    const outstanding = sql<number>`coalesce(sum(${amount}) filter (where ${billed} and ${c.paymentStatus} = 'not_paid'), 0)`;

    const term = search ? `%${search}%` : null;
    const rows = await db
      .select({
        courseId: vaccinationCourses.id,
        status: vaccinationCourses.status,
        doseCount: vaccinationCourses.doseCount,
        intervalValue: vaccinationCourses.intervalValue,
        intervalUnit: vaccinationCourses.intervalUnit,
        startDate: vaccinationCourses.startDate,
        createdAt: vaccinationCourses.createdAt,
        patientId: patients.id,
        patientFirstname: patients.firstname,
        patientLastname: patients.lastname,
        patientMrn: patients.mrn,
        patientPhone: patients.phone,
        patientCountryCode: patients.countryCode,
        vaccineName: vaccines.name,
        billedDoses: sql<number>`count(*) filter (where ${billed})`.mapWith(Number),
        paidDoses: sql<number>`count(*) filter (where ${billed} and ${c.paymentStatus} = 'paid')`.mapWith(Number),
        waived: sql<number>`coalesce(sum(${amount}) filter (where ${billed} and ${c.paymentStatus} = 'waived'), 0)`.mapWith(Number),
        total: total.mapWith(Number),
        outstanding: outstanding.mapWith(Number),
      })
      .from(vaccinationCourses)
      .innerJoin(vaccines, eq(vaccinationCourses.vaccineId, vaccines.id))
      .innerJoin(patients, eq(vaccinationCourses.patientId, patients.id))
      .innerJoin(d, eq(d.courseId, vaccinationCourses.id))
      .leftJoin(c, and(eq(d.chargeId, c.id), isNull(c.deletedAt)))
      .where(and(
        eq(vaccinationCourses.organisationId, orgId),
        isNull(patients.deletedAt),
        term
          ? or(
              ilike(patients.firstname, term),
              ilike(patients.lastname, term),
              ilike(patients.mrn, term),
              ilike(vaccines.name, term),
              sql`(${patients.firstname} || ' ' || ${patients.lastname}) ILIKE ${term}`,
            )
          : undefined,
      ))
      .groupBy(vaccinationCourses.id, patients.id, vaccines.id)
      .having(
        status === "unpaid" ? sql`${outstanding} > 0`
        : status === "paid" ? sql`${total} > 0 and ${outstanding} = 0`
        : sql`${total} > 0`,
      )
      .orderBy(desc(vaccinationCourses.createdAt))
      .limit(300);

    // Courses with something outstanding, for the tab badge.
    const [{ unpaidCourses }] = await db
      .select({ unpaidCourses: sql<number>`count(distinct ${d.courseId})`.mapWith(Number) })
      .from(d)
      .innerJoin(c, and(eq(d.chargeId, c.id), isNull(c.deletedAt)))
      .innerJoin(patients, eq(d.patientId, patients.id))
      .where(and(eq(d.organisationId, orgId), sql`${d.status} <> 'cancelled'`, eq(c.paymentStatus, "not_paid"), isNull(patients.deletedAt)));

    return NextResponse.json({
      courses: rows.map((r) => ({ ...r, paid: r.total - r.outstanding - r.waived, period: describePeriod(r.doseCount, r.intervalValue, r.intervalUnit) })),
      unpaidCourses,
    });
  } catch (error) {
    console.error("Error fetching vaccination bills:", error);
    return NextResponse.json({ error: "Failed to fetch vaccination bills" }, { status: 500 });
  }
}
