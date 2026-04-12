/**
 * Migration: add status + delivered_at columns to supply_order_items
 *
 * Run once: npx tsx lib/db/add-order-item-status.ts
 */

import { db } from "./index";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Adding status + delivered_at to supply_order_items…");

  await db.execute(sql`
    ALTER TABLE supply_order_items
      ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
  `);

  console.log("Done ✓");
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
