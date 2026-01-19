import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function addNextOfKinFields() {
  console.log("Adding next of kin fields to patients table...");

  // Add next_of_kin_firstname column (nullable)
  await db.execute(sql`
    ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS next_of_kin_firstname TEXT
  `);

  // Add next_of_kin_lastname column (nullable)
  await db.execute(sql`
    ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS next_of_kin_lastname TEXT
  `);

  // Add next_of_kin_relationship column (nullable)
  await db.execute(sql`
    ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS next_of_kin_relationship TEXT
  `);

  // Add next_of_kin_address column (nullable)
  await db.execute(sql`
    ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS next_of_kin_address TEXT
  `);

  // Add next_of_kin_phone column (nullable)
  await db.execute(sql`
    ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS next_of_kin_phone TEXT
  `);

  // Add next_of_kin_email column (nullable)
  await db.execute(sql`
    ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS next_of_kin_email TEXT
  `);

  console.log("Next of kin fields added to patients table successfully.");
  process.exit(0);
}

addNextOfKinFields().catch((err) => {
  console.error("Failed to add next of kin fields to patients table:", err);
  process.exit(1);
});
