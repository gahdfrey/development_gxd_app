import "dotenv/config";
import { db } from "./index";
import { appointments } from "./schema";
import { notInArray } from "drizzle-orm";

async function main() {
  console.log("Identifying appointments with irregular statuses...");

  const validStatuses = ["scheduled", "completed", "cancelled", "no-show"];

  // Find IDs first
  const irregularAppointments = await db
    .select()
    .from(appointments)
    .where(notInArray(appointments.status, validStatuses));

  if (irregularAppointments.length === 0) {
    console.log("No irregular appointments found.");
    process.exit(0);
  }

  console.log(
    `Found ${irregularAppointments.length} appointments with weird statuses:`,
  );
  irregularAppointments.forEach((apt) => {
    console.log(
      `- ID: ${apt.id}, Status: ${apt.status}, Date: ${apt.appointmentDate}`,
    );
  });

  console.log('Updating statuses to "completed"...');

  await db
    .update(appointments)
    .set({ status: "completed" })
    .where(notInArray(appointments.status, validStatuses));

  console.log("Update complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
