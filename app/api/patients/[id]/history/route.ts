import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  patients, hmos, appointments, visits, requests,
  requestResults, users, departments, labTests,
} from "@/lib/db/schema";
import { eq, desc, and, isNull, inArray } from "drizzle-orm";
import { auth } from "@/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam } = await params;
    const patientId = parseInt(idParam);
    if (isNaN(patientId)) {
      return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
    }

    // 1. Patient + HMO name
    const patientRows = await db
      .select({
        id: patients.id,
        firstname: patients.firstname,
        lastname: patients.lastname,
        gender: patients.gender,
        dob: patients.dob,
        phone: patients.phone,
        countryCode: patients.countryCode,
        insuranceType: patients.insuranceType,
        hmoId: patients.hmoId,
        hmoName: hmos.name,
        policyNumber: patients.policyNumber,
        maidenName: patients.maidenName,
        nextOfKinFirstname: patients.nextOfKinFirstname,
        nextOfKinLastname: patients.nextOfKinLastname,
        nextOfKinRelationship: patients.nextOfKinRelationship,
        nextOfKinAddress: patients.nextOfKinAddress,
        nextOfKinPhone: patients.nextOfKinPhone,
        nextOfKinEmail: patients.nextOfKinEmail,
        createdAt: patients.createdAt,
      })
      .from(patients)
      .leftJoin(hmos, eq(patients.hmoId, hmos.id))
      .where(and(eq(patients.id, patientId), isNull(patients.deletedAt)))
      .limit(1);

    if (patientRows.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const patient = patientRows[0];

    // 2. All appointments for this patient (with doctor info and visit info)
    const apptRows = await db
      .select({
        id: appointments.id,
        appointmentDate: appointments.appointmentDate,
        appointmentTime: appointments.appointmentTime,
        status: appointments.status,
        visitType: appointments.visitType,
        notes: appointments.notes,
        createdAt: appointments.createdAt,
        doctorFirstname: users.firstname,
        doctorLastname: users.lastname,
        visitDurationMinutes: visits.durationMinutes,
        visitDoctorNotes: visits.doctorNotes,
        visitStartTime: visits.startTime,
        visitEndTime: visits.endTime,
      })
      .from(appointments)
      .leftJoin(users, eq(appointments.doctorId, users.id))
      .leftJoin(visits, eq(visits.appointmentId, appointments.id))
      .where(eq(appointments.patientId, patientId))
      .orderBy(desc(appointments.createdAt));

    // 3. All requests for this patient (with test, dept, results)
    const requestRows = await db
      .select({
        id: requests.id,
        appointmentId: requests.appointmentId,
        status: requests.status,
        paymentStatus: requests.paymentStatus,
        createdAt: requests.createdAt,
        testName: labTests.name,
        testPrice: labTests.price,
        departmentName: departments.name,
        requestedByFirstname: users.firstname,
        requestedByLastname: users.lastname,
      })
      .from(requests)
      .leftJoin(labTests, eq(requests.testId, labTests.id))
      .leftJoin(departments, eq(requests.departmentId, departments.id))
      .leftJoin(users, eq(requests.requestedBy, users.id))
      .where(eq(requests.patientId, patientId))
      .orderBy(desc(requests.createdAt));

    // 4. All results for those requests
    const requestIds = requestRows.map((r) => r.id);
    let resultRows: any[] = [];
    if (requestIds.length > 0) {
      const allResults = await db
        .select({
          id: requestResults.id,
          requestId: requestResults.requestId,
          fileName: requestResults.fileName,
          filePath: requestResults.filePath,
          fileType: requestResults.fileType,
          message: requestResults.message,
          createdAt: requestResults.createdAt,
          uploadedByFirstname: users.firstname,
          uploadedByLastname: users.lastname,
        })
        .from(requestResults)
        .leftJoin(users, eq(requestResults.uploadedBy, users.id))
        .where(inArray(requestResults.requestId, requestIds));
      resultRows = allResults;
    }

    // Build a map: requestId -> results[]
    const resultsByRequest: Record<number, typeof resultRows> = {};
    for (const r of resultRows) {
      if (!resultsByRequest[r.requestId]) resultsByRequest[r.requestId] = [];
      resultsByRequest[r.requestId].push(r);
    }

    // Build a map: appointmentId -> requests[]
    const requestsByAppointment: Record<number, typeof requestRows> = {};
    const unlinkedRequests: typeof requestRows = [];
    for (const r of requestRows) {
      if (r.appointmentId) {
        if (!requestsByAppointment[r.appointmentId]) requestsByAppointment[r.appointmentId] = [];
        requestsByAppointment[r.appointmentId].push(r);
      } else {
        unlinkedRequests.push(r);
      }
    }

    // Build timeline
    const timeline = apptRows.map((appt) => ({
      appointment: {
        id: appt.id,
        appointmentDate: appt.appointmentDate,
        appointmentTime: appt.appointmentTime,
        status: appt.status,
        visitType: appt.visitType,
        notes: appt.notes,
        createdAt: appt.createdAt,
        doctorFirstname: appt.doctorFirstname,
        doctorLastname: appt.doctorLastname,
      },
      visit: appt.visitDurationMinutes != null
        ? {
            durationMinutes: appt.visitDurationMinutes,
            doctorNotes: appt.visitDoctorNotes,
            startTime: appt.visitStartTime,
            endTime: appt.visitEndTime,
          }
        : null,
      requests: (requestsByAppointment[appt.id] ?? []).map((req) => ({
        ...req,
        results: resultsByRequest[req.id] ?? [],
      })),
    }));

    // Stats
    const completedVisits = apptRows.filter((a) => a.status === "completed").length;
    const totalRequests = requestRows.length;
    const paidRequests = requestRows.filter((r) => r.paymentStatus === "paid").length;
    const resultsReceived = Object.values(resultsByRequest).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );

    return NextResponse.json({
      patient,
      stats: { completedVisits, totalRequests, paidRequests, resultsReceived },
      timeline,
      unlinkedRequests: unlinkedRequests.map((req) => ({
        ...req,
        results: resultsByRequest[req.id] ?? [],
      })),
    });
  } catch (error) {
    console.error("Error fetching patient history:", error);
    return NextResponse.json(
      { error: "Failed to fetch patient history" },
      { status: 500 },
    );
  }
}
