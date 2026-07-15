import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { getOrgId } from "@/lib/org";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: paramId } = await params;
    const id = parseInt(paramId);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
    }

    const patient = await db
      .select()
      .from(patients)
      .where(and(eq(patients.id, id), isNull(patients.deletedAt), eq(patients.organisationId, orgId)))
      .limit(1);

    if (patient.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json(patient[0]);
  } catch (error) {
    console.error("Error fetching patient:", error);
    return NextResponse.json({ error: "Failed to fetch patient" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["patients", "edit"], ["dashboard", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: paramId } = await params;
    const id = parseInt(paramId);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
    }

    const body = await request.json();
    const {
      firstname,
      lastname,
      gender,
      dob,
      maidenName,
      nin,
      countryCode,
      phone,
      insuranceType,
      hmoId,
      policyNumber,
      nextOfKinFirstname,
      nextOfKinLastname,
      nextOfKinRelationship,
      nextOfKinAddress,
      nextOfKinPhone,
      nextOfKinEmail,
    } = body;

    if (!firstname || !lastname || !gender || !dob || !countryCode || !phone || !insuranceType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (insuranceType === "hmo") {
      if (!hmoId) {
        return NextResponse.json({ error: "HMO selection is required for HMO insurance type" }, { status: 400 });
      }
      if (!policyNumber || policyNumber.trim() === "") {
        return NextResponse.json({ error: "Policy number is required for HMO insurance type" }, { status: 400 });
      }
    }

    if (nextOfKinEmail && nextOfKinEmail.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(nextOfKinEmail)) {
        return NextResponse.json({ error: "Invalid next of kin email address" }, { status: 400 });
      }
    }

    // NIN validation + uniqueness among active patients in this facility.
    const cleanNin = typeof nin === "string" && nin.trim() !== "" ? nin.trim() : null;
    if (cleanNin) {
      if (!/^\d{11}$/.test(cleanNin)) {
        return NextResponse.json({ error: "NIN must be exactly 11 digits" }, { status: 400 });
      }
      const [ninMatch] = await db
        .select({ id: patients.id, mrn: patients.mrn, firstname: patients.firstname, lastname: patients.lastname })
        .from(patients)
        .where(and(
          eq(patients.organisationId, orgId),
          isNull(patients.deletedAt),
          eq(patients.nin, cleanNin),
        ))
        .limit(1);
      if (ninMatch && ninMatch.id !== id) {
        return NextResponse.json(
          { error: `This NIN already belongs to another patient (${ninMatch.firstname} ${ninMatch.lastname}, ${ninMatch.mrn}).` },
          { status: 409 },
        );
      }
    }

    const updatedPatient = await db
      .update(patients)
      .set({
        firstname,
        lastname,
        gender,
        dob,
        maidenName: maidenName || null,
        nin: cleanNin,
        countryCode,
        phone,
        insuranceType,
        hmoId: hmoId ? parseInt(hmoId) : null,
        policyNumber: policyNumber || null,
        nextOfKinFirstname: nextOfKinFirstname || null,
        nextOfKinLastname: nextOfKinLastname || null,
        nextOfKinRelationship: nextOfKinRelationship || null,
        nextOfKinAddress: nextOfKinAddress || null,
        nextOfKinPhone: nextOfKinPhone || null,
        nextOfKinEmail: nextOfKinEmail || null,
        updatedAt: new Date(),
      })
      .where(and(eq(patients.id, id), eq(patients.organisationId, orgId)))
      .returning();

    if (updatedPatient.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "update",
      entityType: "patient",
      entityId: id,
      details: { firstname, lastname, insuranceType },
    });

    return NextResponse.json(updatedPatient[0]);
  } catch (error) {
    console.error("Error updating patient:", error);
    return NextResponse.json({ error: "Failed to update patient" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await requirePermission([["patients", "delete"], ["dashboard", "delete"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const { id: paramId } = await params;
    const id = parseInt(paramId);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid patient ID" }, { status: 400 });
    }

    const deletedPatient = await db
      .update(patients)
      .set({ deletedAt: new Date() })
      .where(and(eq(patients.id, id), isNull(patients.deletedAt), eq(patients.organisationId, orgId)))
      .returning();

    if (deletedPatient.length === 0) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "delete",
      entityType: "patient",
      entityId: id,
      details: { softDelete: true },
    });

    return NextResponse.json({ message: "Patient deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting patient:", error);
    return NextResponse.json({ error: "Failed to delete patient" }, { status: 500 });
  }
}
