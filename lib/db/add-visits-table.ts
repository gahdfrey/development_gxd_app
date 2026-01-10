import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function addVisitsTable() {
  console.log("Adding visits table...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS visits (
      id SERIAL PRIMARY KEY,
      appointment_id INTEGER NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      doctor_notes TEXT,
      duration_minutes INTEGER NOT NULL,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  console.log("Visits table added successfully.");
  process.exit(0);
}

addVisitsTable().catch((err) => {
  console.error("Failed to add visits table:", err);
  process.exit(1);
});
