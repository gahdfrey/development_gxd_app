import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments, patients, users } from "@/lib/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { getOrgId } from "@/lib/org";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET() {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      .where(eq(appointments.organisationId, orgId))
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

    const validVisitTypes = ["new visit", "follow up", "review", "first visit after discharge", "drug refill"];
    if (visitType && !validVisitTypes.includes(visitType)) {
      return NextResponse.json({ error: "Invalid visit type" }, { status: 400 });
    }

    const newAppointment = await db
      .insert(appointments)
      .values({
        organisationId: orgId,
        patientId: parseInt(patientId),
        doctorId: parseInt(doctorId),
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
