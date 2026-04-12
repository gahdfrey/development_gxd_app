import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function addCancellationReason() {
  console.log("Adding cancellation_reason column to supply_orders...");

  await db.execute(sql`
    ALTER TABLE supply_orders
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT
  `);

  console.log("Done.");
  process.exit(0);
}

addCancellationReason().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
