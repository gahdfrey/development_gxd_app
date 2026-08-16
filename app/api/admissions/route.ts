import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admissions, beds } from "@/lib/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { admissionQuery } from "@/lib/admissions";
import { ADMISSION_SEVERITY_KEYS } from "@/lib/constants";

const VALID_ADMISSION_TYPES = ["elective", "emergency", "transfer-in"];

export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission([["admission", "view"]]);
    if (authz.error) return authz.error;
    const orgId = authz.ctx.orgId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const conditions = [eq(admissions.organisationId, orgId)];
    if (status) conditions.push(eq(admissions.status, status));

    const allAdmissions = await admissionQuery()
      .where(and(...conditions))
      // Requested rows have no admittedAt yet, so fall back to when they were
      // raised — otherwise they'd all sort together at one end of the list.
      .orderBy(desc(sql`COALESCE(${admissions.admittedAt}, ${admissions.requestedAt}, ${admissions.createdAt})`));

    return NextResponse.json(allAdmissions, { status: 200 });
  } catch (error) {
    console.error("Error fetching admissions:", error);
    return NextResponse.json({ error: "Failed to fetch admissions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["admission", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const {
      patientId, appointmentId, wardId, bedId,
      admittingDoctorId, admissionType, admissionReason, severity,
    } = body;

    if (!patientId || !wardId || !bedId || !admittingDoctorId || !admissionReason?.trim()) {
      return NextResponse.json(
        { error: "Missing required fields: patientId, wardId, bedId, admittingDoctorId, admissionReason" },
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
    const parsedWardId = parseInt(wardId);
    const parsedBedId = parseInt(bedId);
    const parsedDoctorId = parseInt(admittingDoctorId);
    const parsedAppointmentId = appointmentId ? parseInt(appointmentId) : null;
    if ([parsedPatientId, parsedWardId, parsedBedId, parsedDoctorId].some((n) => isNaN(n))) {
      return NextResponse.json({ error: "Invalid patient, ward, bed, or doctor reference" }, { status: 400 });
    }

    let newAdmissionId: number;
    try {
      newAdmissionId = await db.transaction(async (tx) => {
        const [bed] = await tx
          .select({ id: beds.id, status: beds.status, wardId: beds.wardId })
          .from(beds)
          .where(and(eq(beds.id, parsedBedId), eq(beds.organisationId, orgId)))
          .limit(1);

        if (!bed) throw new Error("BED_NOT_FOUND");
        if (bed.wardId !== parsedWardId) throw new Error("BED_WARD_MISMATCH");
        if (bed.status !== "available") throw new Error("BED_UNAVAILABLE");

        const [admission] = await tx
          .insert(admissions)
          .values({
            organisationId: orgId,
            patientId: parsedPatientId,
            appointmentId: parsedAppointmentId,
            wardId: parsedWardId,
            bedId: parsedBedId,
            admittingDoctorId: parsedDoctorId,
            admissionType: type,
            admissionReason: admissionReason.trim(),
            severity: caseSeverity,
            status: "admitted",
            admittedAt: new Date(),
          })
          .returning();

        await tx.update(beds).set({ status: "occupied", updatedAt: new Date() }).where(eq(beds.id, parsedBedId));

        return admission.id;
      });
    } catch (txError: any) {
      if (txError.message === "BED_NOT_FOUND") return NextResponse.json({ error: "Bed not found" }, { status: 404 });
      if (txError.message === "BED_WARD_MISMATCH") return NextResponse.json({ error: "Bed does not belong to the selected ward" }, { status: 400 });
      if (txError.message === "BED_UNAVAILABLE") return NextResponse.json({ error: "This bed is not available. Please choose a different bed." }, { status: 409 });
      throw txError;
    }

    const [created] = await admissionQuery().where(eq(admissions.id, newAdmissionId));

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "admission",
      entityId: newAdmissionId,
      details: { patientId: parsedPatientId, wardId: parsedWardId, bedId: parsedBedId, admissionType: type },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating admission:", error);
    return NextResponse.json({ error: "Failed to create admission" }, { status: 500 });
  }
}
