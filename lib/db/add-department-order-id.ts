/**
 * Migration: add department_order_id to supply_orders
 * Run: npx tsx lib/db/add-department-order-id.ts
 */
import { db } from "./index";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Adding department_order_id to supply_orders…");
  await db.execute(sql`
    ALTER TABLE supply_orders
      ADD COLUMN IF NOT EXISTS department_order_id INTEGER;
  `);
  console.log("Done ✓");
  process.exit(0);
}

migrate().catch((err) => { console.error(err); process.exit(1); });
