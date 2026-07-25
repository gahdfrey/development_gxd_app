import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Performance follow-up for the Admission module:
 *  1. wards — the (name, organisation_id) unique index had `name` leading,
 *     so "list this org's wards" (every GET /api/wards call) couldn't use it
 *     and fell back to a full table scan. Replaced with (organisation_id,
 *     name) — same uniqueness guarantee, but org-scoped lookups now hit the
 *     index directly.
 *  2. beds — added a (ward_id, status) index so "available beds in this
 *     ward" (hit on every Admit/Transfer modal open) is an index lookup
 *     instead of a scan-then-filter.
 *  3. appointments — added a patient_id index to support the Admission
 *     module's "this patient's completed appointments" lookup, which
 *     previously had to fetch the entire org's appointment history
 *     client-side and filter in the browser.
 */
async function migrate() {
  console.log("Replacing wards name+org unique index with org-leading index...");
  await db.execute(sql`DROP INDEX IF EXISTS wards_name_org_idx`);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS wards_org_name_idx
      ON wards (organisation_id, name)
  `);

  console.log("Adding beds (ward_id, status) index...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS beds_ward_status_idx
      ON beds (ward_id, status)
  `);

  console.log("Adding appointments patient_id index...");
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS appointments_patient_idx
      ON appointments (patient_id)
  `);

  console.log("Migration completed successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
