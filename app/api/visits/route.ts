import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visits, appointments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getOrgId } from "@/lib/org";

export async function POST(request: Request) {
  try {
    const orgId = await getOrgId();
    if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { appointmentId, patientId, doctorId, doctorNotes, durationMinutes, startTime, endTime } = body;

    if (!appointmentId || !patientId || !doctorId || durationMinutes === undefined || !startTime || !endTime) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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

    await db.update(appointments).set({ status: "completed", updatedAt: new Date() })
      .where(eq(appointments.id, appointmentId));

    return NextResponse.json(newVisit, { status: 201 });
  } catch (error) {
    console.error("Error creating visit:", error);
    return NextResponse.json({ error: "Failed to create visit" }, { status: 500 });
  }
}
