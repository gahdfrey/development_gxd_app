import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Fix: `departments` has a leftover global unique constraint on `name`
 * alone (departments_name_unique), predating multi-tenancy. It blocks two
 * different organisations from both having e.g. a "Laboratory" department.
 * The correct per-org uniqueness is already enforced by the
 * departments_name_org_idx unique index (name, organisation_id) defined in
 * lib/db/schema.ts — this migration just drops the stale global one.
 */
async function migrate() {
  console.log("Dropping stale global unique constraint departments_name_unique...");
  await db.execute(sql`ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_unique`);

  console.log("Migration completed successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
