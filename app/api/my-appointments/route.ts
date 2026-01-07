import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments, patients, users } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET() {
  try {
    // Get the logged-in user's session
    const session = await auth();

    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's ID from their email
    const currentUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (currentUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const doctorId = currentUser[0].id;

    // Fetch appointments for this doctor only
    const doctorAppointments = await db
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
          gender: patients.gender,
          dob: patients.dob,
          phone: patients.phone,
        },
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .where(eq(appointments.doctorId, doctorId))
      .orderBy(appointments.appointmentDate, appointments.appointmentTime);

    return NextResponse.json(doctorAppointments);
  } catch (error) {
    console.error("Error fetching doctor's appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}
