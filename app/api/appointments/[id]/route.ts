import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appointments } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses = ["scheduled", "completed", "cancelled", "no-show"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Update the appointment status
    const updatedAppointment = await db
      .update(appointments)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, parseInt(id)))
      .returning();

    if (updatedAppointment.length === 0) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedAppointment[0]);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }
}
