import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appointments, patients, users, roles } from "@/lib/db/schema";
import {
  eq,
  and,
  or,
  isNotNull,
  asc,
  desc,
  ilike,
  gte,
  lte,
} from "drizzle-orm";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user with permissions
    const userDetails = await db
      .select({
        id: users.id,
        email: users.email,
        permissions: roles.permissions,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (userDetails.length === 0 || !userDetails[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userDetails[0];

    // Check permission - permissions is a JSON object like { "all-appointments": { "view": true } }
    const permissions = user.permissions as Record<
      string,
      Record<string, boolean>
    > | null;
    const hasPermission =
      permissions &&
      "all-appointments" in permissions &&
      permissions["all-appointments"]?.["view"] === true;

    if (!hasPermission) {
      return NextResponse.json(
        {
          error:
            "Forbidden: You do not have permission to view all appointments",
        },
        { status: 403 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");

    // Base query conditions
    const conditions = [isNotNull(appointments.id)];

    if (startDate) {
      conditions.push(gte(appointments.appointmentDate, startDate));
    }
    if (endDate) {
      conditions.push(lte(appointments.appointmentDate, endDate));
    }
    if (status) {
      conditions.push(eq(appointments.status, status));
    }
    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      const searchCondition = or(
        ilike(patients.firstname, searchLower),
        ilike(patients.lastname, searchLower),
        ilike(users.firstname, searchLower),
        ilike(users.lastname, searchLower),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    // Fetch all appointments with patient and doctor details, ordered by date (earliest first)
    const allAppointments = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        visitType: appointments.visitType,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        patientId: appointments.patientId,
        patientFirstname: patients.firstname,
        patientLastname: patients.lastname,
        patientGender: patients.gender,
        doctorId: appointments.doctorId,
        doctorFirstname: users.firstname,
        doctorLastname: users.lastname,
      })
      .from(appointments)
      .innerJoin(patients, eq(appointments.patientId, patients.id))
      .innerJoin(users, eq(appointments.doctorId, users.id))
      .where(and(...conditions))
      .orderBy(
        desc(appointments.appointmentDate),
        desc(appointments.appointmentTime),
      );

    // Format the response
    const formattedAppointments = allAppointments.map((apt) => ({
      id: apt.id,
      patientName: `${apt.patientFirstname} ${apt.patientLastname}`,
      patientGender: apt.patientGender,
      doctorName: `Dr. ${apt.doctorFirstname} ${apt.doctorLastname}`,
      status: apt.status,
      visitType: apt.visitType,
      appointmentDate: apt.appointmentDate,
      appointmentTime: apt.appointmentTime,
      notes: apt.notes,
      createdAt: apt.createdAt,
    }));

    return NextResponse.json(formattedAppointments, { status: 200 });
  } catch (error) {
    console.error("Error fetching all appointments:", error);
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 },
    );
  }
}
