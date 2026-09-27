import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Billing plan service entitlements: billing_plan_items links a billing plan
 * to specific catalog services (lab tests / products) it covers for free.
 */
async function migrate() {
  console.log("Creating billing_plan_items table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS billing_plan_items (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      billing_plan_id INTEGER NOT NULL REFERENCES billing_plans(id),
      item_type TEXT NOT NULL,
      item_id INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS billing_plan_items_unique_idx
      ON billing_plan_items (billing_plan_id, item_type, item_id)
  `);

  console.log("Migration completed successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
