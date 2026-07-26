import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Adds per-result "viewed" tracking to request_results.
 *
 * Previously the patient's post-login "N new test results available" banner
 * (app/api/greeting) counted every result from the last 14 days, so it kept
 * re-firing for results the patient had already seen. viewed_at records when
 * the patient first opened a result; the banner now counts only unviewed
 * ones.
 *
 * Backfill: existing results are treated as already viewed (viewed_at =
 * created_at) so the banner immediately stops nagging about old results —
 * only genuinely new uploads from now on will show as unviewed.
 */
async function migrate() {
  console.log("Adding request_results.viewed_at column...");
  await db.execute(sql`ALTER TABLE request_results ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ`);

  console.log("Backfilling existing results as already viewed...");
  await db.execute(sql`UPDATE request_results SET viewed_at = created_at WHERE viewed_at IS NULL`);

  console.log("Migration completed successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
