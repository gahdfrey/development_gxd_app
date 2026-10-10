import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patientCharges, patients, vaccinationCourses, vaccinationDoses, vaccines } from "@/lib/db/schema";
import { and, asc, desc, eq, gt, ilike, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { todayInLagos } from "@/lib/billing/coverage";
import { buildSchedule, describePeriod, getPatientVaccinations, validateBooking } from "@/lib/vaccination";

const VIEWS = ["today", "upcoming", "overdue", "given", "all"] as const;
type View = (typeof VIEWS)[number];

/**
 * GET /api/vaccinations?patientId=12 — one patient's vaccination record
 *   (courses with their doses), for the patient's clinical record.
 * GET /api/vaccinations?view=today|upcoming|overdue|given|all&search= — the
 *   vaccination clinic's worklist: one row per course with a dose in the view
 *   (progress, next due date, what's unpaid).
 */
export async function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const patientIdParam = params.get("patientId");

    if (patientIdParam) {
      // Finance opens the record to see and collect what's owed.
      const authz = await requirePermission([["vaccination", "view"], ["patient-history", "view"], ["finance", "view"]]);
      if (authz.error) return authz.error;
      const { orgId, userId, userEmail } = authz.ctx;
      const patientId = parseInt(patientIdParam);
      if (isNaN(patientId)) return NextResponse.json({ error: "Invalid patient" }, { status: 400 });
      const [patient] = await db
        .select({ id: patients.id })
        .from(patients)
        .where(and(eq(patients.id, patientId), eq(patients.organisationId, orgId), isNull(patients.deletedAt)))
        .limit(1);
      if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
      void logAudit({ organisationId: orgId, userId, userEmail, action: "read", entityType: "vaccination_record", entityId: patientId });
      return NextResponse.json({ courses: await getPatientVaccinations(orgId, patientId) });
    }

    const authz = await requirePermission([["vaccination", "view"]]);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;
    const view: View = (VIEWS as readonly string[]).includes(params.get("view") ?? "") ? (params.get("view") as View) : "today";
    const search = params.get("search")?.trim();
    const today = todayInLagos();

    const conds: (SQL | undefined)[] = [eq(vaccinationDoses.organisationId, orgId), isNull(patients.deletedAt)];
    if (view === "today") conds.push(eq(vaccinationDoses.scheduledDate, today), eq(vaccinationDoses.status, "scheduled"));
    if (view === "upcoming") conds.push(gt(vaccinationDoses.scheduledDate, today), eq(vaccinationDoses.status, "scheduled"));
    if (view === "overdue") conds.push(lt(vaccinationDoses.scheduledDate, today), eq(vaccinationDoses.status, "scheduled"));
    if (view === "given") conds.push(eq(vaccinationDoses.status, "given"));
    if (search) {
      const term = `%${search}%`;
      conds.push(or(
        ilike(patients.firstname, term),
        ilike(patients.lastname, term),
        ilike(patients.mrn, term),
        ilike(vaccines.name, term),
        sql`(${patients.firstname} || ' ' || ${patients.lastname}) ILIKE ${term}`,
      ));
    }

    // Courses with at least one dose matching the view / search…
    const matching = db
      .selectDistinct({ courseId: vaccinationDoses.courseId })
      .from(vaccinationDoses)
      .innerJoin(vaccinationCourses, eq(vaccinationDoses.courseId, vaccinationCourses.id))
      .innerJoin(vaccines, eq(vaccinationCourses.vaccineId, vaccines.id))
      .innerJoin(patients, eq(vaccinationDoses.patientId, patients.id))
      .where(and(...conds));

    // …summarised over all their doses, one row per course.
    const d = vaccinationDoses;
    const open = sql`${d.status} IN ('scheduled', 'missed')`;
    const billed = sql`${patientCharges.id} IS NOT NULL AND ${d.status} <> 'cancelled'`;
    const nextDue = sql<string | null>`min(${d.scheduledDate}) filter (where ${open})`;
    const lastGiven = sql`max(${d.givenAt})`;
    const rows = await db
      .select({
        courseId: vaccinationCourses.id,
        status: vaccinationCourses.status,
        doseCount: vaccinationCourses.doseCount,
        intervalValue: vaccinationCourses.intervalValue,
        intervalUnit: vaccinationCourses.intervalUnit,
        startDate: vaccinationCourses.startDate,
        patientId: patients.id,
        patientFirstname: patients.firstname,
        patientLastname: patients.lastname,
        patientMrn: patients.mrn,
        patientPhone: patients.phone,
        patientCountryCode: patients.countryCode,
        vaccineName: vaccines.name,
        given: sql<number>`count(*) filter (where ${d.status} = 'given')`.mapWith(Number),
        active: sql<number>`count(*) filter (where ${d.status} <> 'cancelled')`.mapWith(Number),
        overdue: sql<number>`count(*) filter (where ${d.status} = 'scheduled' and ${d.scheduledDate} < ${today})`.mapWith(Number),
        missed: sql<number>`count(*) filter (where ${d.status} = 'missed')`.mapWith(Number),
        nextDue,
        lastGivenAt: sql<string | null>`${lastGiven}`,
        total: sql<number>`coalesce(sum(${patientCharges.unitPrice} * ${patientCharges.quantity}) filter (where ${billed}), 0)`.mapWith(Number),
        unpaid: sql<number>`coalesce(sum(${patientCharges.unitPrice} * ${patientCharges.quantity}) filter (where ${billed} and ${patientCharges.paymentStatus} = 'not_paid'), 0)`.mapWith(Number),
      })
      .from(vaccinationCourses)
      .innerJoin(vaccines, eq(vaccinationCourses.vaccineId, vaccines.id))
      .innerJoin(patients, eq(vaccinationCourses.patientId, patients.id))
      .innerJoin(d, eq(d.courseId, vaccinationCourses.id))
      .leftJoin(patientCharges, and(eq(d.chargeId, patientCharges.id), isNull(patientCharges.deletedAt)))
      .where(and(eq(vaccinationCourses.organisationId, orgId), inArray(vaccinationCourses.id, matching)))
      .groupBy(vaccinationCourses.id, patients.id, vaccines.id)
      .orderBy(
        ...(view === "given" ? [sql`${lastGiven} desc nulls last`]
          : view === "all" ? [desc(vaccinationCourses.createdAt)]
          : [sql`${nextDue} asc nulls last`]),
        asc(vaccinationCourses.id),
      )
      .limit(300);

    // Counts for the view tabs: courses with a scheduled dose due today / later / overdue.
    const countCourses = (cond: SQL) => sql<number>`count(distinct ${d.courseId}) filter (where ${cond})`.mapWith(Number);
    const [counts] = await db
      .select({
        today: countCourses(sql`${d.scheduledDate} = ${today}`),
        upcoming: countCourses(sql`${d.scheduledDate} > ${today}`),
        overdue: countCourses(sql`${d.scheduledDate} < ${today}`),
      })
      .from(d)
      .innerJoin(patients, eq(d.patientId, patients.id))
      .where(and(eq(d.organisationId, orgId), eq(d.status, "scheduled"), isNull(patients.deletedAt)));

    return NextResponse.json({
      courses: rows.map((r) => ({ ...r, period: describePeriod(r.doseCount, r.intervalValue, r.intervalUnit) })),
      counts,
    });
  } catch (error) {
    console.error("Error fetching vaccinations:", error);
    return NextResponse.json({ error: "Failed to fetch vaccinations" }, { status: 500 });
  }
}

/**
 * POST /api/vaccinations — book a patient on a vaccine:
 *   { patientId, vaccineId, startDate, doseCount, intervalValue, intervalUnit, notes? }
 * Creates the course, one dose per due date, and a bill line per dose at the
 * vaccine's current price (so the patient can pay from their portal).
 */
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["vaccination", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const v = validateBooking(await request.json());
    if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
    const b = v.value;

    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, b.patientId), eq(patients.organisationId, orgId), isNull(patients.deletedAt)))
      .limit(1);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    const [vaccine] = await db
      .select()
      .from(vaccines)
      .where(and(eq(vaccines.id, b.vaccineId), eq(vaccines.organisationId, orgId), isNull(vaccines.deletedAt), eq(vaccines.isActive, true)))
      .limit(1);
    if (!vaccine) return NextResponse.json({ error: "That vaccine isn't available — check Setup → Vaccines" }, { status: 404 });

    const dates = buildSchedule(b.startDate, b.doseCount, b.intervalValue, b.intervalUnit);

    const courseId = await db.transaction(async (tx) => {
      const [course] = await tx
        .insert(vaccinationCourses)
        .values({
          organisationId: orgId,
          patientId: b.patientId,
          vaccineId: vaccine.id,
          startDate: b.startDate,
          doseCount: b.doseCount,
          intervalValue: b.intervalValue,
          intervalUnit: b.intervalUnit,
          notes: b.notes,
          createdBy: userId,
        })
        .returning({ id: vaccinationCourses.id });

      for (const [i, date] of dates.entries()) {
        const [charge] = await tx
          .insert(patientCharges)
          .values({
            organisationId: orgId,
            patientId: b.patientId,
            sourceType: "vaccine",
            chargeDate: date,
            description: b.doseCount > 1 ? `${vaccine.name} — dose ${i + 1} of ${b.doseCount}` : vaccine.name,
            unitPrice: vaccine.price,
            taxCode: vaccine.taxCode,
            createdBy: userId,
          })
          .returning({ id: patientCharges.id });
        await tx.insert(vaccinationDoses).values({
          organisationId: orgId,
          courseId: course.id,
          patientId: b.patientId,
          doseNumber: i + 1,
          scheduledDate: date,
          chargeId: charge.id,
        });
      }
      return course.id;
    });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "create",
      entityType: "vaccination_course",
      entityId: courseId,
      details: { patientId: b.patientId, vaccine: vaccine.name, dates, pricePerDose: vaccine.price },
    });

    return NextResponse.json({ id: courseId, dates }, { status: 201 });
  } catch (error) {
    console.error("Error booking vaccination:", error);
    return NextResponse.json({ error: "Failed to book vaccination" }, { status: 500 });
  }
}
