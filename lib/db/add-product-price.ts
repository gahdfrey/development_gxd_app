/**
 * Migration: add `price` column to `products`
 * Run: npx tsx lib/db/add-product-price.ts
 */
import { db } from "./index";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Adding price column to products…");

  await db.execute(sql`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS price INTEGER NOT NULL DEFAULT 0;
  `);

  console.log("Done ✓");
  process.exit(0);
}

migrate().catch((err) => { console.error(err); process.exit(1); });
