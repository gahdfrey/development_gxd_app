/**
 * Migration: split single `status` into `department_status` + `supply_status`
 * Run: npx tsx lib/db/add-split-statuses.ts
 */
import { db } from "./index";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Adding department_status and supply_status columns…");

  await db.execute(sql`
    ALTER TABLE supply_orders
      ADD COLUMN IF NOT EXISTS department_status TEXT NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS supply_status     TEXT NOT NULL DEFAULT 'pending';
  `);

  // Backfill from existing status column
  await db.execute(sql`
    UPDATE supply_orders SET
      department_status = CASE
        WHEN status IN ('approved', 'delivered', 'cancelled') THEN 'accepted'
        ELSE 'pending'
      END,
      supply_status = CASE
        WHEN status = 'approved'  THEN 'accepted'
        WHEN status = 'delivered' THEN 'delivered'
        WHEN status = 'cancelled' THEN 'cancelled'
        ELSE 'pending'
      END;
  `);

  console.log("Done ✓");
  process.exit(0);
}

migrate().catch((err) => { console.error(err); process.exit(1); });
