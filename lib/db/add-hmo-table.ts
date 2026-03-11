import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function addHMOTable() {
  console.log("Creating HMO table...");

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hmos (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  console.log("HMO table created successfully.");
  process.exit(0);
}

addHMOTable().catch((err) => {
  console.error("Failed to create HMO table:", err);
  process.exit(1);
});
