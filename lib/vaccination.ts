import { addDays, addMonths, addWeeks, addYears, format, isValid, parseISO } from "date-fns";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { patientCharges, users, vaccinationCourses, vaccinationDoses, vaccines } from "@/lib/db/schema";
import { isTaxCode, DEFAULT_TAX_CODE } from "@/lib/billing/tax";
import { todayInLagos } from "@/lib/billing/coverage";

export const INTERVAL_UNITS = {
  day: { label: "Day(s)" },
  week: { label: "Week(s)" },
  month: { label: "Month(s)" },
  year: { label: "Year(s)" },
} as const;
export type IntervalUnit = keyof typeof INTERVAL_UNITS;

export function isIntervalUnit(v: unknown): v is IntervalUnit {
  return typeof v === "string" && v in INTERVAL_UNITS;
}

/** "every 1 month", "every 6 weeks" — or "single dose". */
export function describePeriod(doseCount: number, intervalValue: number, intervalUnit: string): string {
  if (doseCount <= 1 || intervalValue <= 0) return "Single dose";
  const unit = intervalValue === 1 ? intervalUnit : `${intervalUnit}s`;
  return `${doseCount} doses, every ${intervalValue} ${unit}`;
}

const MAX_DOSES = 20;

function wholeNumber(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isInteger(n) ? n : NaN;
}

function validatePeriod(input: Record<string, unknown>) {
  const doseCount = wholeNumber(input.doseCount ?? 1);
  if (!(doseCount >= 1 && doseCount <= MAX_DOSES)) return { error: `Number of doses must be between 1 and ${MAX_DOSES}` } as const;
  const intervalValue = doseCount === 1 ? 0 : wholeNumber(input.intervalValue);
  if (doseCount > 1 && !(intervalValue >= 1 && intervalValue <= 365)) {
    return { error: "Set how often the patient comes back (at least 1)" } as const;
  }
  const intervalUnit = input.intervalUnit ?? "month";
  if (!isIntervalUnit(intervalUnit)) return { error: "Invalid interval" } as const;
  return { value: { doseCount, intervalValue, intervalUnit } } as const;
}

/** Setup → Vaccines form. */
export function validateVaccine(input: Record<string, unknown>) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { error: "Vaccine name is required" } as const;
  const description = typeof input.description === "string" && input.description.trim() ? input.description.trim() : null;
  const price = wholeNumber(input.price);
  if (!(price >= 0)) return { error: "Price must be a whole Naira amount" } as const;
  const taxCode = input.taxCode ?? DEFAULT_TAX_CODE;
  if (!isTaxCode(taxCode)) return { error: "Invalid tax code" } as const;
  const period = validatePeriod(input);
  if ("error" in period) return { error: period.error } as const;
  return {
    value: { name, description, price, taxCode, isActive: input.isActive !== false, ...period.value },
  } as const;
}

export function isDateString(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && isValid(parseISO(v));
}

/** Booking form: when the first dose is, and the period between doses. */
export function validateBooking(input: Record<string, unknown>) {
  const patientId = wholeNumber(input.patientId);
  const vaccineId = wholeNumber(input.vaccineId);
  if (!(patientId > 0)) return { error: "Choose a patient" } as const;
  if (!(vaccineId > 0)) return { error: "Choose a vaccine" } as const;
  if (!isDateString(input.startDate)) return { error: "Choose the date of the first dose" } as const;
  if (input.startDate < todayInLagos()) return { error: "The first dose can't be in the past" } as const;
  const period = validatePeriod(input);
  if ("error" in period) return { error: period.error } as const;
  const notes = typeof input.notes === "string" && input.notes.trim() ? input.notes.trim().slice(0, 1000) : null;
  return { value: { patientId, vaccineId, startDate: input.startDate, notes, ...period.value } } as const;
}

/** The date of every dose: the first on startDate, then one per interval. */
export function buildSchedule(startDate: string, doseCount: number, intervalValue: number, intervalUnit: IntervalUnit): string[] {
  const start = parseISO(startDate);
  const step = { day: addDays, week: addWeeks, month: addMonths, year: addYears }[intervalUnit];
  return Array.from({ length: doseCount }, (_, i) => format(step(start, i * intervalValue), "yyyy-MM-dd"));
}

/** "overdue" is a scheduled dose whose date has passed. */
export function displayStatus(status: string, scheduledDate: string, today = todayInLagos()): string {
  return status === "scheduled" && scheduledDate < today ? "overdue" : status;
}

export interface DoseView {
  id: number;
  courseId: number;
  doseNumber: number;
  scheduledDate: string;
  status: string;
  givenAt: Date | null;
  givenByName: string | null;
  batchNumber: string | null;
  site: string | null;
  notes: string | null;
  chargeId: number | null;
  amount: number | null;
  paymentStatus: string | null;
}

export interface CourseView {
  id: number;
  vaccineId: number;
  vaccineName: string;
  vaccineDescription: string | null;
  startDate: string;
  doseCount: number;
  intervalValue: number;
  intervalUnit: string;
  period: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  doses: DoseView[];
}

/**
 * A patient's vaccination record — every course with its doses, each dose's
 * bill line and who gave it. Shared by the staff patient view and the
 * patient portal. "overdue" is applied to dose status here.
 */
export async function getPatientVaccinations(orgId: number, patientId: number): Promise<CourseView[]> {
  const courses = await db
    .select({
      id: vaccinationCourses.id,
      vaccineId: vaccinationCourses.vaccineId,
      vaccineName: vaccines.name,
      vaccineDescription: vaccines.description,
      startDate: vaccinationCourses.startDate,
      doseCount: vaccinationCourses.doseCount,
      intervalValue: vaccinationCourses.intervalValue,
      intervalUnit: vaccinationCourses.intervalUnit,
      status: vaccinationCourses.status,
      notes: vaccinationCourses.notes,
      createdAt: vaccinationCourses.createdAt,
    })
    .from(vaccinationCourses)
    .innerJoin(vaccines, eq(vaccinationCourses.vaccineId, vaccines.id))
    .where(and(eq(vaccinationCourses.organisationId, orgId), eq(vaccinationCourses.patientId, patientId)))
    .orderBy(asc(vaccinationCourses.startDate), asc(vaccinationCourses.id));
  if (courses.length === 0) return [];

  const doses = await db
    .select({
      id: vaccinationDoses.id,
      courseId: vaccinationDoses.courseId,
      doseNumber: vaccinationDoses.doseNumber,
      scheduledDate: vaccinationDoses.scheduledDate,
      status: vaccinationDoses.status,
      givenAt: vaccinationDoses.givenAt,
      givenByFirstname: users.firstname,
      givenByLastname: users.lastname,
      batchNumber: vaccinationDoses.batchNumber,
      site: vaccinationDoses.site,
      notes: vaccinationDoses.notes,
      chargeId: vaccinationDoses.chargeId,
    })
    .from(vaccinationDoses)
    .leftJoin(users, eq(vaccinationDoses.givenBy, users.id))
    .where(and(eq(vaccinationDoses.organisationId, orgId), inArray(vaccinationDoses.courseId, courses.map((c) => c.id))))
    .orderBy(asc(vaccinationDoses.doseNumber));

  const chargeIds = doses.map((d) => d.chargeId).filter((v): v is number => v != null);
  const charges = chargeIds.length > 0
    ? await db
        .select({ id: patientCharges.id, unitPrice: patientCharges.unitPrice, quantity: patientCharges.quantity, paymentStatus: patientCharges.paymentStatus })
        .from(patientCharges)
        .where(and(inArray(patientCharges.id, chargeIds), isNull(patientCharges.deletedAt)))
    : [];
  const chargeById = new Map(charges.map((c) => [c.id, c]));

  const today = todayInLagos();
  const dosesByCourse = new Map<number, DoseView[]>();
  for (const d of doses) {
    const charge = d.chargeId != null ? chargeById.get(d.chargeId) : undefined;
    const list = dosesByCourse.get(d.courseId) ?? [];
    list.push({
      id: d.id,
      courseId: d.courseId,
      doseNumber: d.doseNumber,
      scheduledDate: d.scheduledDate,
      status: displayStatus(d.status, d.scheduledDate, today),
      givenAt: d.givenAt,
      givenByName: d.givenByFirstname ? `${d.givenByFirstname} ${d.givenByLastname ?? ""}`.trim() : null,
      batchNumber: d.batchNumber,
      site: d.site,
      notes: d.notes,
      chargeId: charge ? d.chargeId : null,
      amount: charge ? charge.unitPrice * charge.quantity : null,
      paymentStatus: charge?.paymentStatus ?? null,
    });
    dosesByCourse.set(d.courseId, list);
  }

  return courses.map((c) => ({
    ...c,
    period: describePeriod(c.doseCount, c.intervalValue, c.intervalUnit),
    doses: dosesByCourse.get(c.id) ?? [],
  }));
}
