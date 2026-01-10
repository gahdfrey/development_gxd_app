import "dotenv/config";
import { db } from "./index";
import { users, patients, appointments } from "./schema";
import { eq } from "drizzle-orm";

async function createTestAppointments() {
  try {
    console.log("Finding Shawn Murphy...");

    // Find Shawn Murphy (doctor)
    const [doctor] = await db
      .select()
      .from(users)
      .where(eq(users.username, "smurphy"));

    if (!doctor) {
      console.error("Shawn Murphy not found!");
      process.exit(1);
    }

    console.log(
      `Found doctor: ${doctor.firstname} ${doctor.lastname} (ID: ${doctor.id})`
    );

    // Get some patients
    const allPatients = await db.select().from(patients).limit(5);

    if (allPatients.length === 0) {
      console.error("No patients found in database!");
      process.exit(1);
    }

    console.log(`Found ${allPatients.length} patients`);

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];

    console.log(`Creating appointments for ${dateStr}...`);

    // Create appointments between 9:30 and 10:30
    const appointmentTimes = ["09:30", "09:45", "10:00", "10:15", "10:30"];

    for (
      let i = 0;
      i < appointmentTimes.length && i < allPatients.length;
      i++
    ) {
      await db.insert(appointments).values({
        patientId: allPatients[i].id,
        doctorId: doctor.id,
        appointmentDate: dateStr,
        appointmentTime: appointmentTimes[i],
        status: "scheduled",
        notes: `Test appointment ${i + 1}`,
      });

      console.log(
        `Created appointment at ${appointmentTimes[i]} for patient ${allPatients[i].firstname} ${allPatients[i].lastname}`
      );
    }

    console.log("\n✅ Test appointments created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error creating test appointments:", error);
    process.exit(1);
  }
}

createTestAppointments();
