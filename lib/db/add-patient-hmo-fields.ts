import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function addPatientHMOFields() {
  console.log("Adding HMO fields to patients table...");

  // Add hmo_id column (nullable, references hmos table)
  await db.execute(sql`
    ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS hmo_id INTEGER REFERENCES hmos(id)
  `);

  // Add policy_number column (nullable)
  await db.execute(sql`
    ALTER TABLE patients
    ADD COLUMN IF NOT EXISTS policy_number TEXT
  `);

  console.log("HMO fields added to patients table successfully.");
  process.exit(0);
}

addPatientHMOFields().catch((err) => {
  console.error("Failed to add HMO fields to patients table:", err);
  process.exit(1);
});
