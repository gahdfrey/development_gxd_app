import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments, patients, hmos, prescriptions } from "@/lib/db/schema";
import { desc, asc, eq, or, ilike, and, gte, lte, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { getOrgId } from "@/lib/org";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const doctorId = parseInt(session.user.id);

    const { searchParams } = new URL(request.url);
    const orderBy = searchParams.get("orderBy") || "desc";
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const conditions: any[] = [
      eq(appointments.doctorId, doctorId),
      eq(appointments.organisationId, orgId),
    ];

    if (startDate) conditions.push(gte(appointments.appointmentDate, startDate));
    if (endDate) conditions.push(lte(appointments.appointmentDate, endDate));
    if (search && search.trim() !== "") {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(or(ilike(patients.firstname, searchTerm), ilike(patients.lastname, searchTerm)));
    }

    let queryBuilder = db
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
          gender: patients.gender,
          dob: patients.dob,
          phone: patients.phone,
          countryCode: patients.countryCode,
          insuranceType: patients.insuranceType,
          hmoId: patients.hmoId,
          policyNumber: patients.policyNumber,
          hmoName: hmos.name,
        },
        hasRequest: sql<boolean>`EXISTS (
          SELECT 1 FROM requests
          WHERE requests.appointment_id = ${appointments.id}
        )`,
        hasPrescription: sql<boolean>`EXISTS (
          SELECT 1 FROM prescriptions
          WHERE prescriptions.appointment_id = ${appointments.id}
        )`,
      })
      .from(appointments)
      .leftJoin(patients, eq(appointments.patientId, patients.id))
      .leftJoin(hmos, eq(patients.hmoId, hmos.id))
      .where(and(...conditions)) as any;

    const doctorAppointments =
      orderBy === "asc"
        ? await queryBuilder.orderBy(asc(appointments.appointmentDate), asc(appointments.appointmentTime))
        : await queryBuilder.orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));

    return NextResponse.json(doctorAppointments);
  } catch (error) {
    console.error("Error fetching doctor's appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}
