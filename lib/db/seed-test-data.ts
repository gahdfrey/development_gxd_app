import "dotenv/config";
import { db } from "./index";
import { users, patients, appointments } from "./schema";
import bcrypt from "bcrypt";

async function seedTestData() {
  console.log("Creating test users (doctors)...");

  // First, create some doctors
  const hashedPassword = await bcrypt.hash("password123", 10);
  const doctorIds: number[] = [];

  const doctors = [
    {
      firstname: "John",
      lastname: "Smith",
      email: "dr.smith@hospital.com",
      username: "drsmith",
    },
    {
      firstname: "Sarah",
      lastname: "Johnson",
      email: "dr.johnson@hospital.com",
      username: "drjohnson",
    },
    {
      firstname: "Michael",
      lastname: "Williams",
      email: "dr.williams@hospital.com",
      username: "drwilliams",
    },
    {
      firstname: "Emily",
      lastname: "Brown",
      email: "dr.brown@hospital.com",
      username: "drbrown",
    },
    {
      firstname: "David",
      lastname: "Jones",
      email: "dr.jones@hospital.com",
      username: "drjones",
    },
  ];

  for (const doctor of doctors) {
    const result = await db
      .insert(users)
      .values({
        ...doctor,
        password: hashedPassword,
        roleId: 1, // Assuming doctor role ID is 1
      })
      .returning({ id: users.id });
    doctorIds.push(result[0].id);
  }

  console.log(`Created ${doctorIds.length} doctors.`);

  console.log("Creating 20 test patients...");

  const patientData = [
    {
      firstname: "Emma",
      lastname: "Anderson",
      gender: "Female",
      dob: "1990-05-15",
      countryCode: "+1",
      phone: "5551234567",
      insuranceType: "Private",
    },
    {
      firstname: "Liam",
      lastname: "Martinez",
      gender: "Male",
      dob: "1985-08-22",
      countryCode: "+1",
      phone: "5551234568",
      insuranceType: "Medicare",
    },
    {
      firstname: "Olivia",
      lastname: "Garcia",
      gender: "Female",
      dob: "1992-03-10",
      countryCode: "+1",
      phone: "5551234569",
      insuranceType: "Private",
    },
    {
      firstname: "Noah",
      lastname: "Rodriguez",
      gender: "Male",
      dob: "1988-11-30",
      countryCode: "+1",
      phone: "5551234570",
      insuranceType: "Medicaid",
    },
    {
      firstname: "Ava",
      lastname: "Wilson",
      gender: "Female",
      dob: "1995-07-18",
      countryCode: "+1",
      phone: "5551234571",
      insuranceType: "Private",
    },
    {
      firstname: "Ethan",
      lastname: "Moore",
      gender: "Male",
      dob: "1983-12-05",
      countryCode: "+1",
      phone: "5551234572",
      insuranceType: "Private",
    },
    {
      firstname: "Sophia",
      lastname: "Taylor",
      gender: "Female",
      dob: "1991-09-25",
      countryCode: "+1",
      phone: "5551234573",
      insuranceType: "Medicare",
    },
    {
      firstname: "Mason",
      lastname: "Thomas",
      gender: "Male",
      dob: "1987-04-14",
      countryCode: "+1",
      phone: "5551234574",
      insuranceType: "Private",
    },
    {
      firstname: "Isabella",
      lastname: "Jackson",
      gender: "Female",
      dob: "1993-06-08",
      countryCode: "+1",
      phone: "5551234575",
      insuranceType: "Medicaid",
    },
    {
      firstname: "James",
      lastname: "White",
      gender: "Male",
      dob: "1989-02-20",
      countryCode: "+1",
      phone: "5551234576",
      insuranceType: "Private",
    },
    {
      firstname: "Mia",
      lastname: "Harris",
      gender: "Female",
      dob: "1994-10-12",
      countryCode: "+1",
      phone: "5551234577",
      insuranceType: "Private",
    },
    {
      firstname: "Benjamin",
      lastname: "Martin",
      gender: "Male",
      dob: "1986-01-28",
      countryCode: "+1",
      phone: "5551234578",
      insuranceType: "Medicare",
    },
    {
      firstname: "Charlotte",
      lastname: "Thompson",
      gender: "Female",
      dob: "1996-08-03",
      countryCode: "+1",
      phone: "5551234579",
      insuranceType: "Private",
    },
    {
      firstname: "Lucas",
      lastname: "Lee",
      gender: "Male",
      dob: "1984-05-19",
      countryCode: "+1",
      phone: "5551234580",
      insuranceType: "Private",
    },
    {
      firstname: "Amelia",
      lastname: "Walker",
      gender: "Female",
      dob: "1997-11-07",
      countryCode: "+1",
      phone: "5551234581",
      insuranceType: "Medicaid",
    },
    {
      firstname: "Henry",
      lastname: "Hall",
      gender: "Male",
      dob: "1982-03-16",
      countryCode: "+1",
      phone: "5551234582",
      insuranceType: "Private",
    },
    {
      firstname: "Harper",
      lastname: "Allen",
      gender: "Female",
      dob: "1998-07-22",
      countryCode: "+1",
      phone: "5551234583",
      insuranceType: "Private",
    },
    {
      firstname: "Alexander",
      lastname: "Young",
      gender: "Male",
      dob: "1990-09-11",
      countryCode: "+1",
      phone: "5551234584",
      insuranceType: "Medicare",
    },
    {
      firstname: "Evelyn",
      lastname: "King",
      gender: "Female",
      dob: "1991-12-29",
      countryCode: "+1",
      phone: "5551234585",
      insuranceType: "Private",
    },
    {
      firstname: "William",
      lastname: "Wright",
      gender: "Male",
      dob: "1988-04-05",
      countryCode: "+1",
      phone: "5551234586",
      insuranceType: "Private",
    },
  ];

  const patientIds: number[] = [];
  for (const patient of patientData) {
    const result = await db
      .insert(patients)
      .values(patient)
      .returning({ id: patients.id });
    patientIds.push(result[0].id);
  }

  console.log(`Created ${patientIds.length} patients.`);

  console.log("Creating 100 test appointments...");

  const statuses = ["scheduled", "completed", "cancelled", "no-show"];
  const appointmentNotes = [
    "Regular checkup",
    "Follow-up appointment",
    "Annual physical",
    "Consultation",
    "Lab results review",
    "Medication review",
    "Vaccination",
    "Health screening",
    null,
    null,
  ];

  // Generate appointments for the next 60 days and past 30 days
  const today = new Date();
  const appointmentsToCreate = [];

  for (let i = 0; i < 100; i++) {
    // Random date between -30 and +60 days
    const daysOffset = Math.floor(Math.random() * 91) - 30;
    const appointmentDate = new Date(today);
    appointmentDate.setDate(appointmentDate.getDate() + daysOffset);

    // Random time between 8 AM and 5 PM
    const hour = Math.floor(Math.random() * 9) + 8; // 8-16
    const minute = Math.random() < 0.5 ? "00" : "30";

    // Random patient and doctor
    const patientId = patientIds[Math.floor(Math.random() * patientIds.length)];
    const doctorId = doctorIds[Math.floor(Math.random() * doctorIds.length)];

    // Status based on date
    let status;
    if (daysOffset < -7) {
      // Past appointments more likely to be completed or other statuses
      const rand = Math.random();
      if (rand < 0.7) status = "completed";
      else if (rand < 0.85) status = "cancelled";
      else status = "no-show";
    } else if (daysOffset < 0) {
      // Recent past appointments
      const rand = Math.random();
      if (rand < 0.8) status = "completed";
      else if (rand < 0.9) status = "cancelled";
      else status = "no-show";
    } else {
      // Future appointments mostly scheduled
      status = Math.random() < 0.9 ? "scheduled" : "cancelled";
    }

    appointmentsToCreate.push({
      patientId,
      doctorId,
      appointmentDate: appointmentDate.toISOString().split("T")[0],
      appointmentTime: `${hour.toString().padStart(2, "0")}:${minute}`,
      status,
      notes:
        appointmentNotes[Math.floor(Math.random() * appointmentNotes.length)],
    });
  }

  await db.insert(appointments).values(appointmentsToCreate);

  console.log("Created 100 appointments.");
  console.log("\n✅ Test data seeding complete!");
  console.log(`   - 5 doctors created`);
  console.log(`   - 20 patients created`);
  console.log(`   - 100 appointments created`);

  process.exit(0);
}

seedTestData().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
