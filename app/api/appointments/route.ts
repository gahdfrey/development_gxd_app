import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments, patients, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    // Fetch all appointments with patient and doctor information
    const allAppointments = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
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
      .orderBy(
        desc(appointments.appointmentDate),
        desc(appointments.appointmentTime)
      );

    return NextResponse.json(allAppointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      patientId,
      doctorId,
      appointmentDate,
      appointmentTime,
      status,
      notes,
    } = body;

    // Validate required fields
    if (!patientId || !doctorId || !appointmentDate || !appointmentTime) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: patientId, doctorId, appointmentDate, appointmentTime",
        },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(appointmentTime)) {
      return NextResponse.json(
        { error: "Invalid time format. Use HH:MM (24-hour format)" },
        { status: 400 }
      );
    }

    // Create new appointment
    const newAppointment = await db
      .insert(appointments)
      .values({
        patientId: parseInt(patientId),
        doctorId: parseInt(doctorId),
        appointmentDate,
        appointmentTime,
        status: status || "scheduled",
        notes: notes || null,
      })
      .returning();

    // Fetch the complete appointment with patient and doctor details
    const appointment = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
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

    return NextResponse.json(appointment[0], { status: 201 });
  } catch (error) {
    console.error("Error creating appointment:", error);
    return NextResponse.json(
      { error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}
