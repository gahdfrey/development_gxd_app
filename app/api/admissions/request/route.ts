import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admissions, appointments, patients } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { admissionQuery } from "@/lib/admissions";
import { ADMISSION_SEVERITY_KEYS } from "@/lib/constants";

const VALID_ADMISSION_TYPES = ["elective", "emergency", "transfer-in"];

/**
 * Raise an admission request from a consultation — the doctor's half of the
 * admission flow. No ward or bed is chosen here: the request lands in the
 * Admission module's queue, where the desk allocates a bed (POST
 * /api/admissions/[id]/admit) or turns it down (.../decline).
 */
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["admission", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const { patientId, appointmentId, admissionType, admissionReason, severity } = body;

    if (!patientId || !admissionReason?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, admissionReason" },
        { status: 400 },
      );
    }

    const type = admissionType || "elective";
    if (!VALID_ADMISSION_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid admission type" }, { status: 400 });
    }

    const caseSeverity = severity || "routine";
    if (!ADMISSION_SEVERITY_KEYS.includes(caseSeverity)) {
      return NextResponse.json({ error: "Invalid severity" }, { status: 400 });
    }

    const parsedPatientId = parseInt(patientId);
    const parsedAppointmentId = appointmentId ? parseInt(appointmentId) : null;
    if (isNaN(parsedPatientId) || (appointmentId && isNaN(parsedAppointmentId!))) {
      return NextResponse.json({ error: "Invalid patient or appointment reference" }, { status: 400 });
    }

    // Both references must belong to the caller's org — never trust the ids in
    // the body to be in-tenant.
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, parsedPatientId), eq(patients.organisationId, orgId)))
      .limit(1);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    if (parsedAppointmentId) {
      const [appointment] = await db
        .select({ id: appointments.id })
        .from(appointments)
        .where(and(eq(appointments.id, parsedAppointmentId), eq(appointments.organisationId, orgId)))
        .limit(1);
      if (!appointment) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
    }

    // One open admission per patient at a time — a pending request or a live
    // stay both block a second request, so the desk never sees duplicates.
    const [open] = await db
      .select({ id: admissions.id, status: admissions.status })
      .from(admissions)
      .where(
        and(
          eq(admissions.patientId, parsedPatientId),
          eq(admissions.organisationId, orgId),
          inArray(admissions.status, ["requested", "admitted"]),
        ),
      )
      .limit(1);

    if (open) {
      return NextResponse.json(
        {
          error:
            open.status === "admitted"
              ? "This patient is already admitted."
              : "An admission request for this patient is already awaiting a bed.",
        },
        { status: 409 },
      );
    }

    const [created] = await db
      .insert(admissions)
      .values({
        organisationId: orgId,
        patientId: parsedPatientId,
        appointmentId: parsedAppointmentId,
        admittingDoctorId: actorId,
        admissionType: type,
        admissionReason: admissionReason.trim(),
        severity: caseSeverity,
        status: "requested",
        requestedBy: actorId,
        requestedAt: new Date(),
      })
      .returning({ id: admissions.id });

    const [record] = await admissionQuery().where(eq(admissions.id, created.id));

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "admission_request",
      entityId: created.id,
      details: { patientId: parsedPatientId, appointmentId: parsedAppointmentId, severity: caseSeverity, admissionType: type },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error("Error creating admission request:", error);
    return NextResponse.json({ error: "Failed to create admission request" }, { status: 500 });
  }
}
