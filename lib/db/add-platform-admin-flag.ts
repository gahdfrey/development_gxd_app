import { sql } from "drizzle-orm";
import { db } from "./index";

async function main() {
  console.log("Adding is_platform_admin column to users...");
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false
  `);
  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
