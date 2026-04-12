import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  console.log("Adding department_id to users table...");
  await db.execute(sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id)
  `);
  console.log("Done.");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
