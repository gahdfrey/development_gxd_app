import "dotenv/config";
import { readFileSync } from "fs";
import { gunzipSync } from "zlib";
import { join } from "path";
import { db } from "./index";
import { icd11Codes } from "./schema";
import { sql } from "drizzle-orm";

interface Entry {
  code: string;
  title: string;
  chapter: string;
  isLeaf: boolean;
}

/**
 * Seed the icd11_codes reference table from the bundled WHO ICD-11 MMS
 * 2024-01 release (lib/db/data/icd11-mms-2024.json.gz). Idempotent:
 * re-running upserts titles. Safe to run on every deploy.
 */
async function seed() {
  const path = join(__dirname, "data", "icd11-mms-2024.json.gz");
  console.log("Reading ICD-11 dataset from", path);
  const entries: Entry[] = JSON.parse(gunzipSync(readFileSync(path)).toString("utf-8"));
  console.log(`Loaded ${entries.length} ICD-11 codes. Seeding...`);

  const BATCH = 1000;
  let done = 0;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    await db
      .insert(icd11Codes)
      .values(
        batch.map((e) => ({
          code: e.code,
          title: e.title,
          chapter: e.chapter || null,
          isLeaf: e.isLeaf,
        })),
      )
      .onConflictDoUpdate({
        target: icd11Codes.code,
        set: {
          title: sql`excluded.title`,
          chapter: sql`excluded.chapter`,
          isLeaf: sql`excluded.is_leaf`,
        },
      });
    done += batch.length;
    if (done % 5000 === 0 || done === entries.length) {
      console.log(`  seeded ${done}/${entries.length}`);
    }
  }

  const [{ count }] = await db.execute<{ count: number }>(
    sql`SELECT COUNT(*)::int AS count FROM icd11_codes`,
  ) as unknown as [{ count: number }];
  console.log(`Done. icd11_codes now holds ${count} rows.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("ICD-11 seed failed:", err);
  process.exit(1);
});
