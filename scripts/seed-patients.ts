import "dotenv/config";
import { db } from "../lib/db/index";
import { patients } from "../lib/db/schema";

const samplePatients = [
  {
    firstname: "Emily",
    lastname: "Martinez",
    gender: "female",
    dob: "1987-04-18",
    maidenName: "Rodriguez",
    countryCode: "+34",
    phone: "612345678",
    insuranceType: "private",
  },
  {
    firstname: "Thomas",
    lastname: "Wilson",
    gender: "male",
    dob: "1972-09-10",
    maidenName: "",
    countryCode: "+1",
    phone: "2125551234",
    insuranceType: "hmo",
  },
  {
    firstname: "Blessing",
    lastname: "Adeyemi",
    gender: "female",
    dob: "1994-01-22",
    maidenName: "Okeke",
    countryCode: "+234",
    phone: "8087654321",
    insuranceType: "private",
  },
  {
    firstname: "Carlos",
    lastname: "Silva",
    gender: "male",
    dob: "1989-06-30",
    maidenName: "",
    countryCode: "+55",
    phone: "11987654321",
    insuranceType: "hmo",
  },
  {
    firstname: "Priya",
    lastname: "Sharma",
    gender: "female",
    dob: "1991-11-05",
    maidenName: "Patel",
    countryCode: "+91",
    phone: "9876543210",
    insuranceType: "private",
  },
  {
    firstname: "Oliver",
    lastname: "Thompson",
    gender: "male",
    dob: "1983-03-14",
    maidenName: "",
    countryCode: "+44",
    phone: "7911234567",
    insuranceType: "hmo",
  },
  {
    firstname: "Ngozi",
    lastname: "Okoro",
    gender: "female",
    dob: "1996-08-27",
    maidenName: "Chukwu",
    countryCode: "+234",
    phone: "7098765432",
    insuranceType: "private",
  },
  {
    firstname: "Lucas",
    lastname: "Dubois",
    gender: "male",
    dob: "1978-12-03",
    maidenName: "",
    countryCode: "+33",
    phone: "612345678",
    insuranceType: "hmo",
  },
  {
    firstname: "Yuki",
    lastname: "Tanaka",
    gender: "female",
    dob: "1993-05-19",
    maidenName: "Sato",
    countryCode: "+81",
    phone: "9012345678",
    insuranceType: "private",
  },
  {
    firstname: "Benjamin",
    lastname: "Schmidt",
    gender: "male",
    dob: "1981-07-08",
    maidenName: "",
    countryCode: "+49",
    phone: "15123456789",
    insuranceType: "hmo",
  },
  {
    firstname: "Chiamaka",
    lastname: "Nnamdi",
    gender: "female",
    dob: "1997-02-16",
    maidenName: "Uzo",
    countryCode: "+234",
    phone: "8156789012",
    insuranceType: "private",
  },
  {
    firstname: "Mohammed",
    lastname: "Al-Rashid",
    gender: "male",
    dob: "1986-10-11",
    maidenName: "",
    countryCode: "+971",
    phone: "501234567",
    insuranceType: "hmo",
  },
  {
    firstname: "Sophie",
    lastname: "van der Berg",
    gender: "female",
    dob: "1990-04-25",
    maidenName: "de Vries",
    countryCode: "+31",
    phone: "612345678",
    insuranceType: "private",
  },
  {
    firstname: "Ibrahim",
    lastname: "Yusuf",
    gender: "male",
    dob: "1984-09-02",
    maidenName: "",
    countryCode: "+234",
    phone: "8034567890",
    insuranceType: "hmo",
  },
];

async function seedPatients() {
  try {
    console.log("Starting to seed patients...");

    for (const patient of samplePatients) {
      await db.insert(patients).values(patient);
      console.log(
        `✓ Created patient: ${patient.firstname} ${patient.lastname}`
      );
    }

    console.log("\n✅ Successfully created 14 patients!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding patients:", error);
    process.exit(1);
  }
}

seedPatients();
