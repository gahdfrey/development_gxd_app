import { db } from "@/lib/db";
import { appointments, organisations, users } from "@/lib/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { friendlyDate, friendlyTime, sendToPatient } from "@/lib/messaging/send";

const HOUR = 3_600_000;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

/** UTC instant of a WAT appointment date + "HH:MM". */
export function appointmentInstant(date: string, time: string): Date | null {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  if ([y, m, d, hh].some((n) => Number.isNaN(n))) return null;
  return new Date(Date.UTC(y, m - 1, d, hh - 1, mm || 0)); // WAT = UTC+1
}

/**
 * Sends due appointment reminders for every hospital with SMS on: the
 * day-before reminder once the appointment is within 24 h (skipped if it
 * was booked inside that window — the booking confirmation covers it), and
 * the 2-hour reminder once within 2 h. Idempotent (dedupe keys), so it is
 * safe to run as often as every few minutes. Returns what it did.
 */
export async function processDueReminders(now: Date = new Date(), executor: Executor = db) {
  const today = new Date(now.getTime() + HOUR).toISOString().slice(0, 10);
  const dayAfter = new Date(now.getTime() + HOUR + 2 * 86_400_000).toISOString().slice(0, 10);

  const rows = await executor
    .select({
      id: appointments.id,
      orgId: appointments.organisationId,
      patientId: appointments.patientId,
      date: appointments.appointmentDate,
      time: appointments.appointmentTime,
      createdAt: appointments.createdAt,
      doctorFirstname: users.firstname,
      doctorLastname: users.lastname,
    })
    .from(appointments)
    .innerJoin(organisations, and(eq(appointments.organisationId, organisations.id), eq(organisations.smsEnabled, true)))
    .leftJoin(users, eq(appointments.doctorId, users.id))
    .where(and(eq(appointments.status, "scheduled"), gte(appointments.appointmentDate, today), lte(appointments.appointmentDate, dayAfter)));

  const results: { appointmentId: number; kind: string; status: string; reason?: string }[] = [];
  for (const a of rows) {
    const at = appointmentInstant(a.date, a.time);
    if (!at) continue;
    const until = at.getTime() - now.getTime();
    if (until <= 0) continue;
    const vars = {
      when: a.date === today ? "today" : "tomorrow",
      date: friendlyDate(a.date),
      time: friendlyTime(a.time),
      doctor: a.doctorFirstname ? `Dr ${a.doctorFirstname} ${a.doctorLastname ?? ""}`.trim() : "your doctor",
    };
    let kind: "reminder_24h" | "reminder_2h" | null = null;
    if (until <= 2 * HOUR) {
      if (now.getTime() - a.createdAt.getTime() > 30 * 60_000) kind = "reminder_2h";
    } else if (until <= 24 * HOUR) {
      if (at.getTime() - a.createdAt.getTime() > 24 * HOUR) kind = "reminder_24h";
    }
    if (!kind) continue;
    const out = await sendToPatient({
      orgId: a.orgId,
      patientId: a.patientId,
      kind,
      vars,
      dedupeKey: `appt:${a.id}:${kind}`,
      relatedType: "appointment",
      relatedId: a.id,
    }, executor);
    if (out.status !== "not_sent" || out.reason !== "Already sent") {
      results.push({ appointmentId: a.id, kind, status: out.status, reason: out.reason });
    }
  }
  return results;
}
