import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { appointments, patients, users, roles } from "@/lib/db/schema";
import { eq, and, or, isNotNull, asc, desc, ilike, gte, lte } from "drizzle-orm";
import { getOrgId } from "@/lib/org";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = parseInt(session.user.id);

    const [userDetails] = await db
      .select({ permissions: roles.permissions })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(and(eq(users.id, userId), eq(users.organisationId, orgId)))
      .limit(1);

    if (!userDetails) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const permissions = userDetails.permissions as Record<string, string[] | Record<string, boolean>> | null;
    let hasPermission = false;
    if (permissions && "all-appointments" in permissions) {
      const modulePerm = permissions["all-appointments"];
      if (Array.isArray(modulePerm)) hasPermission = modulePerm.includes("view");
      else if (typeof modulePerm === "object" && modulePerm !== null) hasPermission = modulePerm["view"] === true;
    }

    if (!hasPermission) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to view all appointments" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const status = searchParams.get("status");
    const orderDate = searchParams.get("orderDate");

    const conditions: any[] = [
      isNotNull(appointments.id),
      eq(appointments.organisationId, orgId),
    ];

    if (startDate) conditions.push(gte(appointments.appointmentDate, startDate));
    if (endDate) conditions.push(lte(appointments.appointmentDate, endDate));
    if (status) conditions.push(eq(appointments.status, status));
    if (search) {
      const searchLower = `%${search.toLowerCase()}%`;
      const searchCondition = or(
        ilike(patients.firstname, searchLower),
        ilike(patients.lastname, searchLower),
        ilike(users.firstname, searchLower),
        ilike(users.lastname, searchLower),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

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
        orderDate === "asc" ? asc(appointments.appointmentDate) : desc(appointments.appointmentDate),
        orderDate === "asc" ? asc(appointments.appointmentTime) : desc(appointments.appointmentTime),
      );

    return NextResponse.json(
      allAppointments.map((apt) => ({
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
      })),
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching all appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}
