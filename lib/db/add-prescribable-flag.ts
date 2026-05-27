import { db } from "./index";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Adding is_prescribable column to products…");
  await db.execute(sql`
    ALTER TABLE products
    ADD COLUMN IF NOT EXISTS is_prescribable BOOLEAN NOT NULL DEFAULT false;
  `);

  console.log("Marking existing pharmacy products as prescribable…");
  await db.execute(sql`
    UPDATE products
    SET is_prescribable = true
    WHERE category = 'pharmacy';
  `);

  console.log("Done ✓");
  process.exit(0);
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
