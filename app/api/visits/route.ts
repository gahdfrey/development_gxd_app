import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visits, appointments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      appointmentId,
      patientId,
      doctorId,
      doctorNotes,
      durationMinutes,
      startTime,
      endTime,
    } = body;

    // Validate required fields
    if (
      !appointmentId ||
      !patientId ||
      !doctorId ||
      durationMinutes === undefined ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create the visit record
    const [newVisit] = await db
      .insert(visits)
      .values({
        appointmentId,
        patientId,
        doctorId,
        doctorNotes: doctorNotes || null,
        durationMinutes,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      })
      .returning();

    // Update appointment status to "completed"
    await db
      .update(appointments)
      .set({
        status: "completed",
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    return NextResponse.json(newVisit, { status: 201 });
  } catch (error) {
    console.error("Error creating visit:", error);
    return NextResponse.json(
      { error: "Failed to create visit" },
      { status: 500 }
    );
  }
}
