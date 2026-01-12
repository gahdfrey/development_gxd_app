import "dotenv/config";
import { db } from "../lib/db";
import { appointments } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";

async function fixDoctorId() {
  try {
    const today = new Date().toISOString().split("T")[0]; // Get today's date
    const yesterdayDate = "2026-01-11"; // The date we created appointments for

    // Update all appointments from yesterday (2026-01-11) that have doctorId = 6 to doctorId = 11
    const result = await db
      .update(appointments)
      .set({ doctorId: 11 })
      .where(
        and(
          eq(appointments.doctorId, 6),
          eq(appointments.appointmentDate, yesterdayDate)
        )
      );

    console.log(
      `Successfully updated appointments from doctor ID 6 to 11 for date ${yesterdayDate}`
    );
    console.log("Result:", result);
  } catch (error) {
    console.error("Error updating appointments:", error);
  } finally {
    process.exit(0);
  }
}

fixDoctorId();
