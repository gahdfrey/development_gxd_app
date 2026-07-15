import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Section-A identity-readiness migration (NDHA registries alignment):
 *  1. patients        — nin (national identity anchor), mrn (local Medical
 *                       Record Number, backfilled + unique per org),
 *                       client_registry_id (reserved for national NHCR ID)
 *  2. organisations   — NHFR minimum "signature domain" facility attributes
 *                       + reserved facility_registry_id
 *  3. users           — professional-council licence fields + reserved
 *                       worker_registry_id (NHWR readiness)
 */
async function migrate() {
  console.log("Adding patient identity columns...");
  await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS nin TEXT`);
  await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS mrn TEXT`);
  await db.execute(sql`ALTER TABLE patients ADD COLUMN IF NOT EXISTS client_registry_id TEXT`);

  console.log("Backfilling MRNs for existing patients...");
  await db.execute(sql`
    UPDATE patients
    SET mrn = 'MRN-' || organisation_id || '-' || LPAD(id::text, 6, '0')
    WHERE mrn IS NULL
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS patients_mrn_org_idx
      ON patients (organisation_id, mrn)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS patients_nin_idx ON patients (nin)
  `);

  console.log("Adding NHFR facility attributes to organisations...");
  const orgColumns = [
    ["facility_registry_id", "TEXT"],
    ["facility_type", "TEXT"],
    ["ownership", "TEXT"],
    ["state", "TEXT"],
    ["lga", "TEXT"],
    ["latitude", "TEXT"],
    ["longitude", "TEXT"],
  ] as const;
  for (const [col, type] of orgColumns) {
    await db.execute(sql.raw(`ALTER TABLE organisations ADD COLUMN IF NOT EXISTS ${col} ${type}`));
  }
  await db.execute(sql`
    ALTER TABLE organisations
      ADD COLUMN IF NOT EXISTS operational_status TEXT NOT NULL DEFAULT 'operational'
  `);

  console.log("Adding NHWR licence columns to users...");
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS license_number TEXT`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS license_council TEXT`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS worker_registry_id TEXT`);

  console.log("Migration completed successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
