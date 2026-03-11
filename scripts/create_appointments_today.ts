import dotenv from "dotenv";

// Load environment variables *before* any db connection
dotenv.config({ path: ".env.local" });

async function createAppointmentsForDoctor() {
  try {
    // Dynamically import db after env vars are set
    const { db } = await import("@/lib/db");
    const { appointments, patients } = await import("@/lib/db/schema");

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];
    console.log(`Creating appointments for doctor ID 11 on ${today}...`);

    // Get all patients
    const allPatients = await db.select().from(patients);
    console.log(`Found ${allPatients.length} patients in the database.`);

    if (allPatients.length === 0) {
      console.log("No patients found. Please create patients first.");
      return;
    }

    // Define appointment times for today (9:00 AM - 5:00 PM with 30-minute intervals)
    const appointmentTimes = [
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
      "13:00",
      "13:30",
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
    ];

    // Create appointments for random patients
    const appointmentsToCreate = [];
    const numAppointments = Math.min(10, allPatients.length); // Create up to 10 appointments

    for (let i = 0; i < numAppointments; i++) {
      const randomPatient =
        allPatients[Math.floor(Math.random() * allPatients.length)];
      const randomTime = appointmentTimes[i % appointmentTimes.length];

      appointmentsToCreate.push({
        doctorId: 11,
        patientId: randomPatient.id,
        appointmentDate: today,
        appointmentTime: randomTime,
        status: "scheduled",
        notes: `Appointment created on ${new Date().toLocaleString()}`,
      });
    }

    // Insert appointments
    const createdAppointments = await db
      .insert(appointments)
      .values(appointmentsToCreate)
      .returning();

    console.log(
      `✅ Successfully created ${createdAppointments.length} appointments for doctor ID 11 on ${today}`
    );
    console.log("\nAppointment details:");
    createdAppointments.forEach((apt, index) => {
      console.log(
        `  ${index + 1}. Patient ID: ${apt.patientId}, Time: ${
          apt.appointmentTime
        }, Status: ${apt.status}`
      );
    });
  } catch (error) {
    console.error("❌ Error creating appointments:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

createAppointmentsForDoctor();
