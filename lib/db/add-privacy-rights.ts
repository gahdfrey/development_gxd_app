import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Tranche 3 migration (GDPR technical alignment):
 *  1. data_requests — patient rectification / erasure requests (GDPR Art. 16/17)
 */
async function migrate() {
  console.log("Creating data_requests table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS data_requests (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      requested_by_user_id INTEGER REFERENCES users(id),
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      details TEXT NOT NULL,
      resolution_note TEXT,
      resolved_by INTEGER REFERENCES users(id),
      resolved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS data_requests_org_status_idx
      ON data_requests (organisation_id, status)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS data_requests_patient_idx
      ON data_requests (patient_id)
  `);

  console.log("Migration completed successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
