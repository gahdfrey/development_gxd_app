import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  patients,
  hmos,
  organisations,
  visits,
  appointments,
  users,
  visitDiagnoses,
  requests,
  labTests,
  requestResults,
  prescriptions,
  products,
  patientConsents,
} from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getAuthContext, hasAnyPermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { buildPatientBundle, type FhirInput } from "@/lib/fhir";

/**
 * GET /api/patients/[id]/fhir — export the patient's record as a FHIR R4
 * collection Bundle (application/fhir+json). Accessible to staff who can view
 * patients, or to the patient's own portal account.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getAuthContext();
    if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: idParam } = await params;
    const patientId = parseInt(idParam);
    if (isNaN(patientId)) {
      return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
    }

    const isOwn = ctx.patientId === patientId;
    const isStaff = hasAnyPermission(ctx, [
      ["patients", "view"],
      ["dashboard", "view"],
    ]);
    if (!isOwn && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Patient + HMO + org (scoped to the caller's organisation).
    const [patient] = await db
      .select({
        id: patients.id,
        firstname: patients.firstname,
        lastname: patients.lastname,
        gender: patients.gender,
        dob: patients.dob,
        countryCode: patients.countryCode,
        phone: patients.phone,
        email: patients.email,
        nin: patients.nin,
        mrn: patients.mrn,
        insuranceType: patients.insuranceType,
        hmoName: hmos.name,
        policyNumber: patients.policyNumber,
        orgId: patients.organisationId,
        orgName: organisations.name,
      })
      .from(patients)
      .leftJoin(hmos, eq(patients.hmoId, hmos.id))
      .leftJoin(organisations, eq(patients.organisationId, organisations.id))
      .where(and(
        eq(patients.id, patientId),
        eq(patients.organisationId, ctx.orgId),
        isNull(patients.deletedAt),
      ));

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    // Visits → encounters (joined to appointments for date/type/status).
    const visitRows = await db
      .select({
        id: visits.id,
        doctorId: visits.doctorId,
        startTime: visits.startTime,
        endTime: visits.endTime,
        date: appointments.appointmentDate,
        time: appointments.appointmentTime,
        status: appointments.status,
        visitType: appointments.visitType,
      })
      .from(visits)
      .leftJoin(appointments, eq(visits.appointmentId, appointments.id))
      .where(eq(visits.patientId, patientId));

    // Practitioners referenced by those visits.
    const doctorIds = [...new Set(visitRows.map((v) => v.doctorId).filter((d): d is number => d != null))];
    const practitioners = doctorIds.length
      ? await db
          .select({
            id: users.id,
            firstname: users.firstname,
            lastname: users.lastname,
            licenseNumber: users.licenseNumber,
            licenseCouncil: users.licenseCouncil,
          })
          .from(users)
          .where(inArray(users.id, doctorIds))
      : [];

    // Diagnoses → conditions.
    const diagnoses = await db
      .select({
        id: visitDiagnoses.id,
        encounterId: visitDiagnoses.visitId,
        icdCode: visitDiagnoses.icdCode,
        icdTitle: visitDiagnoses.icdTitle,
        clinicalText: visitDiagnoses.clinicalText,
        diagnosisType: visitDiagnoses.diagnosisType,
        recordedAt: visitDiagnoses.createdAt,
      })
      .from(visitDiagnoses)
      .where(eq(visitDiagnoses.patientId, patientId));

    // Requests + results → diagnostic reports.
    const reqRows = await db
      .select({
        id: requests.id,
        testName: labTests.name,
        status: requests.status,
        createdAt: requests.createdAt,
      })
      .from(requests)
      .leftJoin(labTests, eq(requests.testId, labTests.id))
      .where(eq(requests.patientId, patientId));

    const reqIds = reqRows.map((r) => r.id);
    const resultRows = reqIds.length
      ? await db
          .select({
            requestId: requestResults.requestId,
            fileName: requestResults.fileName,
            fileType: requestResults.fileType,
            filePath: requestResults.filePath,
            createdAt: requestResults.createdAt,
          })
          .from(requestResults)
          .where(inArray(requestResults.requestId, reqIds))
      : [];

    // Prescriptions → medication requests.
    const rxRows = await db
      .select({
        id: prescriptions.id,
        productName: products.name,
        dosage: prescriptions.dosage,
        status: prescriptions.status,
        createdAt: prescriptions.createdAt,
      })
      .from(prescriptions)
      .leftJoin(products, eq(prescriptions.productId, products.id))
      .where(eq(prescriptions.patientId, patientId));

    // Consents.
    const consentRows = await db
      .select({
        id: patientConsents.id,
        purpose: patientConsents.purpose,
        status: patientConsents.status,
        grantedAt: patientConsents.grantedAt,
        expiresAt: patientConsents.expiresAt,
      })
      .from(patientConsents)
      .where(eq(patientConsents.patientId, patientId));

    const input: FhirInput = {
      org: { id: patient.orgId, name: patient.orgName },
      patient: {
        id: patient.id,
        firstname: patient.firstname,
        lastname: patient.lastname,
        gender: patient.gender,
        dob: patient.dob,
        countryCode: patient.countryCode,
        phone: patient.phone,
        email: patient.email,
        nin: patient.nin,
        mrn: patient.mrn,
        insuranceType: patient.insuranceType,
        hmoName: patient.hmoName,
        policyNumber: patient.policyNumber,
      },
      practitioners,
      encounters: visitRows.map((v) => ({
        id: v.id,
        date: v.date ?? "",
        time: v.time ?? "",
        status: v.status ?? "unknown",
        visitType: v.visitType ?? "visit",
        doctorId: v.doctorId,
        startTime: v.startTime ? new Date(v.startTime).toISOString() : null,
        endTime: v.endTime ? new Date(v.endTime).toISOString() : null,
      })),
      conditions: diagnoses.map((d) => ({
        ...d,
        recordedAt: new Date(d.recordedAt).toISOString(),
      })),
      diagnosticReports: reqRows.map((r) => ({
        id: r.id,
        testName: r.testName,
        status: r.status,
        createdAt: new Date(r.createdAt).toISOString(),
        results: resultRows
          .filter((res) => res.requestId === r.id)
          .map((res) => ({
            fileName: res.fileName,
            fileType: res.fileType,
            filePath: res.filePath,
            createdAt: new Date(res.createdAt).toISOString(),
          })),
      })),
      medications: rxRows.map((m) => ({
        id: m.id,
        productName: m.productName,
        dosage: m.dosage,
        status: m.status,
        createdAt: new Date(m.createdAt).toISOString(),
      })),
      consents: consentRows.map((c) => ({
        id: c.id,
        purpose: c.purpose,
        status: c.status,
        grantedAt: new Date(c.grantedAt).toISOString(),
        expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString() : null,
      })),
    };

    const bundle = buildPatientBundle(input);

    void logAudit({
      organisationId: ctx.orgId,
      userId: ctx.userId,
      userEmail: ctx.userEmail,
      action: "export.fhir",
      entityType: "patient",
      entityId: patientId,
      details: { selfService: isOwn },
    });

    const filename = `patient-${patient.mrn ?? patientId}-fhir.json`;
    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/fhir+json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error building FHIR export:", error);
    return NextResponse.json({ error: "Failed to build FHIR export" }, { status: 500 });
  }
}
