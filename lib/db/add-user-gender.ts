import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/** Adds users.gender (used for the login greeting title: Mr/Mrs). */
async function migrate() {
  console.log("Adding users.gender column...");
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT`);
  console.log("Done.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
