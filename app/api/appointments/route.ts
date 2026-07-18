import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments, patients, users } from "@/lib/db/schema";
import { desc, eq, and, inArray } from "drizzle-orm";
import { getOrgId } from "@/lib/org";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

// Statuses that still occupy the doctor's calendar slot. Cancelled/no-show
// appointments free up the slot for rebooking.
const ACTIVE_APPOINTMENT_STATUSES = ["scheduled", "completed"];

export async function GET(request: Request) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get("doctorId");
    const date = searchParams.get("date");

    const conditions = [eq(appointments.organisationId, orgId)];
    if (doctorId) {
      const parsedDoctorId = parseInt(doctorId);
      if (!isNaN(parsedDoctorId)) conditions.push(eq(appointments.doctorId, parsedDoctorId));
    }
    if (date) conditions.push(eq(appointments.appointmentDate, date));

    const allAppointments = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        visitType: appointments.visitType,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        patient: {
          id: patients.id,
          firstname: patients.firstname,
          lastname: patients.lastname,
          phone: patients.phone,
        },
        doctor: {
          id: users.id,
          firstname: users.firstname,
          lastname: users.lastname,
          email: users.email,
        },
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(users, eq(appointments.doctorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));

    return NextResponse.json(allAppointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authz = await requirePermission([
      ["appointments", "add"],
      ["all-appointments", "add"],
      ["dashboard", "add"],
    ]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const { patientId, doctorId, appointmentDate, appointmentTime, status, visitType, notes } = body;

    if (!patientId || !doctorId || !appointmentDate || !appointmentTime) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, doctorId, appointmentDate, appointmentTime" },
        { status: 400 },
      );
    }

    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(appointmentTime)) {
      return NextResponse.json({ error: "Invalid time format. Use HH:MM (24-hour format)" }, { status: 400 });
    }

    const parsedDoctorId = parseInt(doctorId);
    if (isNaN(parsedDoctorId)) {
      return NextResponse.json({ error: "Invalid doctorId" }, { status: 400 });
    }

    const validVisitTypes = ["new visit", "follow up", "review", "first visit after discharge", "drug refill"];
    if (visitType && !validVisitTypes.includes(visitType)) {
      return NextResponse.json({ error: "Invalid visit type" }, { status: 400 });
    }

    // A doctor can't be double-booked for the same date and time slot.
    const [conflict] = await db
      .select({
        id: appointments.id,
        patientFirstname: patients.firstname,
        patientLastname: patients.lastname,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .where(and(
        eq(appointments.organisationId, orgId),
        eq(appointments.doctorId, parsedDoctorId),
        eq(appointments.appointmentDate, appointmentDate),
        eq(appointments.appointmentTime, appointmentTime),
        inArray(appointments.status, ACTIVE_APPOINTMENT_STATUSES),
      ))
      .limit(1);

    if (conflict) {
      return NextResponse.json(
        {
          error: `This doctor already has an appointment at ${appointmentTime} on ${appointmentDate}${
            conflict.patientFirstname ? ` (with ${conflict.patientFirstname} ${conflict.patientLastname})` : ""
          }. Please choose a different time.`,
        },
        { status: 409 },
      );
    }

    const newAppointment = await db
      .insert(appointments)
      .values({
        organisationId: orgId,
        patientId: parseInt(patientId),
        doctorId: parsedDoctorId,
        appointmentDate,
        appointmentTime,
        status: status || "scheduled",
        visitType: visitType || "new visit",
        notes: notes || null,
      })
      .returning();

    const appointment = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        visitType: appointments.visitType,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        patient: {
          id: patients.id,
          firstname: patients.firstname,
          lastname: patients.lastname,
          phone: patients.phone,
        },
        doctor: {
          id: users.id,
          firstname: users.firstname,
          lastname: users.lastname,
          email: users.email,
        },
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(users, eq(appointments.doctorId, users.id))
      .where(eq(appointments.id, newAppointment[0].id));

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "appointment",
      entityId: newAppointment[0].id,
      details: { patientId: parseInt(patientId), doctorId: parseInt(doctorId), appointmentDate, appointmentTime },
    });

    return NextResponse.json(appointment[0], { status: 201 });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
