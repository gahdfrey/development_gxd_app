/**
 * Creates portal user accounts for all patients who have an email
 * but no existing user account linked to them.
 * Usage: DATABASE_URL="..." npx tsx lib/db/backfill-patient-accounts.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { isNull, ilike, eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function main() {
  // Get Patient role
  const [patientRole] = await db
    .select({ id: schema.roles.id })
    .from(schema.roles)
    .where(ilike(schema.roles.name, "patient"))
    .limit(1);

  if (!patientRole) {
    console.error('❌ No "Patient" role found. Run db:seed first.');
    process.exit(1);
  }

  // Get all patients with an email and no linked user account
  const allPatients = await db.select().from(schema.patients).where(isNull(schema.patients.deletedAt));

  const existingLinks = await db.select({ patientId: schema.users.patientId }).from(schema.users);
  const linkedPatientIds = new Set(existingLinks.map((u) => u.patientId).filter(Boolean));

  const toCreate = allPatients.filter((p) => p.email && !linkedPatientIds.has(p.id));

  console.log(`Found ${toCreate.length} patients needing portal accounts...\n`);

  const hashedPassword = await bcrypt.hash("Password1", 10);
  let created = 0;
  let skipped = 0;

  for (const patient of toCreate) {
    // Build a unique username: firstname.lastname, lowercased
    const base = `${patient.firstname.toLowerCase()}.${patient.lastname.toLowerCase()}`;
    let username = base;

    // Check for username collision and suffix with patient id if needed
    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, username))
      .limit(1);

    if (existing.length > 0) {
      username = `${base}${patient.id}`;
    }

    try {
      await db.insert(schema.users).values({
        firstname: patient.firstname,
        lastname: patient.lastname,
        username,
        email: patient.email!,
        password: hashedPassword,
        roleId: patientRole.id,
        patientId: patient.id,
      });
      created++;
    } catch {
      console.warn(`  ⚠️  Skipped patient ${patient.id} (${patient.email}) — duplicate email`);
      skipped++;
    }
  }

  console.log(`✅ Created ${created} portal accounts.`);
  if (skipped) console.log(`⚠️  Skipped ${skipped} (duplicate email in users table).`);

  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
