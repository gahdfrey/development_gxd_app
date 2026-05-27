import "dotenv/config";
import { db } from "./index";
import { users, patients, appointments } from "./schema";
import { eq, and, like } from "drizzle-orm";

const ORG_ID = 1; // Dleventh Clinic

async function createTestAppointments() {
  try {
    console.log("Finding Shawn Murphy...");

    let doctor = await db
      .select()
      .from(users)
      .where(and(like(users.firstname, "Shawn"), eq(users.organisationId, ORG_ID)))
      .limit(1);

    if (doctor.length === 0) {
      console.log("Shawn Murphy not found, getting first available user...");
      doctor = await db.select().from(users).where(eq(users.organisationId, ORG_ID)).limit(1);
    }

    if (doctor.length === 0) {
      console.error("No users found in database!");
      process.exit(1);
    }

    const selectedDoctor = doctor[0];
    console.log(`Using doctor: ${selectedDoctor.firstname} ${selectedDoctor.lastname} (ID: ${selectedDoctor.id})`);

    const allPatients = await db.select().from(patients).where(eq(patients.organisationId, ORG_ID)).limit(5);

    if (allPatients.length === 0) {
      console.error("No patients found in database!");
      process.exit(1);
    }

    console.log(`Found ${allPatients.length} patients`);

    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];
    console.log(`Creating appointments for ${dateStr}...`);

    const appointmentTimes = ["09:30", "09:45", "10:00", "10:15", "10:30"];

    for (let i = 0; i < appointmentTimes.length && i < allPatients.length; i++) {
      await db.insert(appointments).values({
        organisationId: ORG_ID,
        patientId: allPatients[i].id,
        doctorId: selectedDoctor.id,
        appointmentDate: dateStr,
        appointmentTime: appointmentTimes[i],
        status: "scheduled",
        notes: `Test appointment at ${appointmentTimes[i]}`,
      });

      console.log(`✅ Created appointment at ${appointmentTimes[i]} for patient ${allPatients[i].firstname} ${allPatients[i].lastname}`);
    }

    console.log(`\n✅ Successfully created test appointments for today (${dateStr})!`);
    console.log(`   Doctor: ${selectedDoctor.firstname} ${selectedDoctor.lastname}`);
    console.log(`   Times: 9:30 AM - 10:30 AM (every 15 minutes)`);
    process.exit(0);
  } catch (error) {
    console.error("Error creating test appointments:", error);
    process.exit(1);
  }
}

createTestAppointments();
