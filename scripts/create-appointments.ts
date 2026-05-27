import "dotenv/config";
import { db } from "../lib/db";
import { appointments, users, patients } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function createAppointments() {
  try {
    // Find Dr. tochukwu Essien
    const doctor = await db
      .select()
      .from(users)
      .where(eq(users.firstname, "tochukwu"))
      .limit(1);

    if (doctor.length === 0) {
      console.error("Dr. tochukwu Essien not found");
      return;
    }

    const doctorId = doctor[0].id;
    console.log(
      `Found doctor: ${doctor[0].firstname} ${doctor[0].lastname} (ID: ${doctorId})`
    );

    // Get 10 random patients
    const allPatients = await db.select().from(patients).limit(10);

    if (allPatients.length < 10) {
      console.error(
        `Not enough patients. Found ${allPatients.length}, need 10`
      );
      return;
    }

    // Today's date
    const today = new Date();
    const appointmentDate = today.toISOString().split("T")[0]; // 2026-01-11

    // Create appointment times spread throughout the day up to midnight
    const appointmentTimes = [
      "08:00", // 8:00 AM
      "09:30", // 9:30 AM
      "11:00", // 11:00 AM
      "13:00", // 1:00 PM
      "14:30", // 2:30 PM
      "16:00", // 4:00 PM
      "17:30", // 5:30 PM
      "19:00", // 7:00 PM
      "21:00", // 9:00 PM
      "23:00", // 11:00 PM (last one before midnight)
    ];

    const statuses = ["scheduled", "completed", "cancelled", "no-show"];

    // Create appointments
    for (let i = 0; i < 10; i++) {
      const appointment = {
        organisationId: 1,
        patientId: allPatients[i].id,
        doctorId: doctorId,
        appointmentDate: appointmentDate,
        appointmentTime: appointmentTimes[i],
        status: statuses[i % 4], // Cycle through different statuses
        notes: `Appointment ${i + 1} for Dr. ${doctor[0].firstname} ${
          doctor[0].lastname
        }`,
      };

      await db.insert(appointments).values(appointment);
      console.log(
        `Created appointment ${i + 1}: ${allPatients[i].firstname} ${
          allPatients[i].lastname
        } at ${appointmentTimes[i]}`
      );
    }

    console.log("\nSuccessfully created 10 appointments!");
  } catch (error) {
    console.error("Error creating appointments:", error);
  } finally {
    process.exit(0);
  }
}

createAppointments();
