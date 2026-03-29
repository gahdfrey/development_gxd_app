/**
 * Seed 200 diverse patient records into the database.
 * Usage:
 *   npx tsx lib/db/seed-patients.ts
 *   or for production:
 *   DATABASE_URL="..." npx tsx lib/db/seed-patients.ts
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

// ── Name pools ───────────────────────────────────────────────────────────────

const maleFirstNames = [
  "Chukwuemeka", "Adewale", "Ibrahim", "Babatunde", "Oluwaseun",
  "Chidiebere", "Emeka", "Tochukwu", "Femi", "Segun",
  "Musa", "Uche", "Kayode", "Gbenga", "Nnamdi",
  "Abdullahi", "Ike", "Rotimi", "Olumide", "Damilola",
  "Ifeanyi", "Kelechi", "Yusuf", "Biodun", "Chukwudi",
  "Abiodun", "Sulaimon", "Chinedu", "Oladipo", "Tunde",
  "Okechukwu", "Lanre", "Olusegun", "Chibuike", "Zubair",
  "Olayinka", "Amaechi", "Suleiman", "Dele", "Obinna",
  "James", "Michael", "David", "Emmanuel", "Samuel",
  "Daniel", "Joseph", "Peter", "John", "Paul",
];

const femaleFirstNames = [
  "Ngozi", "Adaeze", "Funmilayo", "Amaka", "Chioma",
  "Fatima", "Blessing", "Kemi", "Yetunde", "Ifeoma",
  "Adaora", "Rukayat", "Chinyere", "Titi", "Sola",
  "Nneka", "Aisha", "Olabisi", "Chinwe", "Folake",
  "Hauwa", "Ebele", "Omowunmi", "Uzoamaka", "Shade",
  "Nkechi", "Mariam", "Tokunbo", "Chika", "Yemi",
  "Adaobiageli", "Zainab", "Omotola", "Ifunanya", "Bisi",
  "Halima", "Ogechi", "Temitope", "Adunola", "Obiageli",
  "Grace", "Faith", "Joy", "Peace", "Mercy",
  "Esther", "Ruth", "Deborah", "Rebecca", "Sarah",
];

const lastNames = [
  "Okafor", "Adeyemi", "Ibrahim", "Bello", "Okonkwo",
  "Adeleke", "Nwosu", "Abubakar", "Eze", "Olawale",
  "Chukwu", "Oladele", "Musa", "Anyanwu", "Fashola",
  "Nwachukwu", "Suleiman", "Ogundipe", "Onyekachi", "Yakubu",
  "Afolabi", "Uzoma", "Lawal", "Obiora", "Danjuma",
  "Obi", "Adeniran", "Usman", "Nweze", "Tijani",
  "Odunayo", "Chukwuemeka", "Babangida", "Agbo", "Oluwole",
  "Nwofor", "Aliyu", "Olanrewaju", "Nnaji", "Garba",
  "Akindele", "Egwuatu", "Hussaini", "Ogbonna", "Salami",
  "Adeoye", "Diallo", "Osei", "Mensah", "Asante",
];

const relationships = [
  "Spouse", "Parent", "Sibling", "Child", "Friend", "Uncle", "Aunt", "Cousin",
];

const cities = [
  "Lagos", "Abuja", "Ibadan", "Kano", "Port Harcourt",
  "Benin City", "Kaduna", "Enugu", "Onitsha", "Owerri",
];

const insuranceTypes: Array<"private" | "hmo" | "corporate"> = [
  "private", "hmo", "corporate",
];

// HMO IDs from the seeded hmos table: 1=Leadway, 2=Hygeia, 3=Reliance
const hmoIds = [1, 2, 3];

// ── Helpers ───────────────────────────────────────────────────────────────────

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pad = (n: number) => String(n).padStart(2, "0");

function randomDob(minAge: number, maxAge: number): string {
  const now = new Date();
  const year = now.getFullYear() - randInt(minAge, maxAge);
  const month = randInt(1, 12);
  const day = randInt(1, 28); // safe for all months
  return `${year}-${pad(month)}-${pad(day)}`;
}

function randomPhone(): string {
  const prefixes = ["0801", "0802", "0803", "0805", "0806", "0807", "0808", "0809",
                    "0810", "0811", "0812", "0813", "0814", "0815", "0816",
                    "0701", "0703", "0705", "0706", "0707", "0708",
                    "0901", "0902", "0903", "0904", "0905", "0906", "0907"];
  const prefix = pick(prefixes);
  const rest = String(randInt(1000000, 9999999));
  return `${prefix}${rest}`;
}

function randomPolicyNumber(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const prefix = pick(letters.split("")) + pick(letters.split(""));
  return `${prefix}-${randInt(10000, 99999)}-${randInt(100, 999)}`;
}

function randomEmail(first: string, last: string, index: number): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
  const slug = `${first.toLowerCase().replace(/\s/g, "")}.${last.toLowerCase()}${index}`;
  return `${slug}@${pick(domains)}`;
}

function randomAddress(): string {
  return `${randInt(1, 99)} ${pick(["Adeola Odeku", "Bode Thomas", "Allen Avenue", "Awolowo Road", "Ahmadu Bello Way", "Zik Avenue", "Nnamdi Azikiwe", "Ring Road", "Agodi Gate", "Otigba Street"])} St, ${pick(cities)}`;
}

// ── Build 200 patient records ─────────────────────────────────────────────────

function buildPatients() {
  const records = [];

  for (let i = 0; i < 200; i++) {
    const gender = i % 2 === 0 ? "Male" : "Female";
    const firstname = gender === "Male" ? pick(maleFirstNames) : pick(femaleFirstNames);
    const lastname = pick(lastNames);
    const insurance = pick(insuranceTypes);

    const hmoId = insurance === "hmo" ? pick(hmoIds) : null;
    const policyNumber = insurance === "hmo" ? randomPolicyNumber() : null;

    const nokGender = Math.random() > 0.5 ? "male" : "female";
    const nokFirst = nokGender === "male" ? pick(maleFirstNames) : pick(femaleFirstNames);
    const nokLast = Math.random() > 0.5 ? lastname : pick(lastNames);

    records.push({
      firstname,
      lastname,
      gender,
      dob: randomDob(5, 85),
      maidenName: gender === "Female" && Math.random() > 0.5 ? pick(lastNames) : null,
      email: Math.random() > 0.3 ? randomEmail(firstname, lastname, i) : null,
      countryCode: "+234",
      phone: randomPhone(),
      insuranceType: insurance,
      hmoId,
      policyNumber,
      nextOfKinFirstname: nokFirst,
      nextOfKinLastname: nokLast,
      nextOfKinRelationship: pick(relationships),
      nextOfKinAddress: randomAddress(),
      nextOfKinPhone: randomPhone(),
      nextOfKinEmail: Math.random() > 0.5 ? randomEmail(nokFirst, nokLast, i + 1000) : null,
    });
  }

  return records;
}

// ── Run ───────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding 200 patients...\n");

  const records = buildPatients();

  // Insert in chunks of 50
  const chunkSize = 50;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    await db.insert(schema.patients).values(chunk);
    console.log(`  ✅ Inserted patients ${i + 1}–${Math.min(i + chunkSize, records.length)}`);
  }

  const total = await db.select().from(schema.patients);
  console.log(`\n🎉 Done — ${total.length} total patients in the database.`);

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
