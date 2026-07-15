import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visits, appointments, visitDiagnoses, icd11Codes } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

interface DiagnosisInput {
  icdCode?: string | null;
  icdTitle?: string | null;
  clinicalText?: string | null;
  diagnosisType?: string;
}

const VALID_DIAGNOSIS_TYPES = ["primary", "secondary", "provisional", "differential"];

export async function POST(request: Request) {
  try {
    // Visits are recorded by clinicians completing a consultation.
    const authz = await requirePermission([
      ["my-appointments", "add"],
      ["my-appointments", "edit"],
      ["appointments", "add"],
      ["appointments", "edit"],
    ]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const { appointmentId, patientId, doctorId, doctorNotes, durationMinutes, startTime, endTime, diagnoses } = body;

    if (!appointmentId || !patientId || !doctorId || durationMinutes === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate diagnoses before writing anything.
    const rawDiagnoses: DiagnosisInput[] = Array.isArray(diagnoses) ? diagnoses : [];
    const cleanDiagnoses = rawDiagnoses
      .map((d) => ({
        icdCode: d.icdCode?.trim() || null,
        icdTitle: d.icdTitle?.trim() || null,
        clinicalText: d.clinicalText?.trim() || null,
        diagnosisType: VALID_DIAGNOSIS_TYPES.includes(d.diagnosisType || "")
          ? (d.diagnosisType as string)
          : "primary",
      }))
      // Keep entries that have at least a code or free text.
      .filter((d) => d.icdCode || d.clinicalText);

    // Any supplied ICD code must exist in the reference table (semantic
    // interoperability — no invented codes reach the record).
    const suppliedCodes = cleanDiagnoses.map((d) => d.icdCode).filter((c): c is string => Boolean(c));
    if (suppliedCodes.length > 0) {
      const known = await db
        .select({ code: icd11Codes.code })
        .from(icd11Codes)
        .where(inArray(icd11Codes.code, suppliedCodes));
      const knownSet = new Set(known.map((k) => k.code));
      const unknown = suppliedCodes.filter((c) => !knownSet.has(c));
      if (unknown.length > 0) {
        return NextResponse.json(
          { error: `Unknown ICD-11 code(s): ${unknown.join(", ")}` },
          { status: 400 },
        );
      }
    }

    const [newVisit] = await db
      .insert(visits)
      .values({
        organisationId: orgId,
        appointmentId,
        patientId,
        doctorId,
        doctorNotes: doctorNotes || null,
        durationMinutes,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      })
      .returning();

    if (cleanDiagnoses.length > 0) {
      await db.insert(visitDiagnoses).values(
        cleanDiagnoses.map((d) => ({
          organisationId: orgId,
          visitId: newVisit.id,
          patientId,
          icdCode: d.icdCode,
          icdTitle: d.icdTitle,
          clinicalText: d.clinicalText,
          diagnosisType: d.diagnosisType,
          recordedBy: actorId,
        })),
      );
    }

    await db.update(appointments).set({ status: "completed", updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId));

    void logAudit({
      organisationId: orgId,
      userId: actorId,
      userEmail: actorEmail,
      action: "create",
      entityType: "visit",
      entityId: newVisit.id,
      details: {
        patientId,
        doctorId,
        appointmentId,
        diagnosisCount: cleanDiagnoses.length,
        icdCodes: suppliedCodes,
      },
    });

    return NextResponse.json(newVisit, { status: 201 });
  } catch (error) {
    console.error("Error creating visit:", error);
    return NextResponse.json({ error: "Failed to create visit" }, { status: 500 });
  }
}
