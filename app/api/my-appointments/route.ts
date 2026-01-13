import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments, patients, users } from "@/lib/db/schema";
import { desc, asc, eq, or, ilike, and } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(request: Request) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const orderBy = searchParams.get("orderBy") || "desc";
    const search = searchParams.get("search");

    // Build base query
    let queryBuilder = db
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
      .leftJoin(patients, eq(appointments.patientId, patients.id));

    // Build WHERE conditions
    const conditions = [eq(appointments.doctorId, doctorId)];

    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(patients.firstname, searchTerm),
          ilike(patients.lastname, searchTerm)
        ) as any
      );
    }

    queryBuilder = queryBuilder.where(and(...conditions)) as any;

    // Apply ordering
    const doctorAppointments =
      orderBy === "asc"
        ? await queryBuilder.orderBy(
            asc(appointments.appointmentDate),
            asc(appointments.appointmentTime)
          )
        : await queryBuilder.orderBy(
            desc(appointments.appointmentDate),
            desc(appointments.appointmentTime)
          );

    return NextResponse.json(doctorAppointments);
  } catch (error) {
    console.error("Error fetching doctor's appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}
