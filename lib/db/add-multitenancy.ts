import { db } from "./index";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("1/7 Creating organisations table…");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS organisations (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL,
      slug        TEXT NOT NULL UNIQUE,
      email       TEXT,
      phone       TEXT,
      address     TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("2/7 Seeding Dleventh Clinic as org #1…");
  await db.execute(sql`
    INSERT INTO organisations (id, name, slug)
    VALUES (1, 'Dleventh Clinic', 'dleventh-clinic')
    ON CONFLICT (slug) DO NOTHING;
  `);
  // Reset sequence so next org gets id=2
  await db.execute(sql`
    SELECT setval('organisations_id_seq', GREATEST((SELECT MAX(id) FROM organisations), 1), true);
  `);

  console.log("3/7 Adding organisation_id columns…");
  const tables = [
    "users", "roles", "patients", "appointments", "visits",
    "departments", "lab_tests", "requests", "inventory_items",
    "products", "supply_orders", "prescriptions",
  ];
  for (const table of tables) {
    await db.execute(sql.raw(`
      ALTER TABLE ${table}
      ADD COLUMN IF NOT EXISTS organisation_id INTEGER REFERENCES organisations(id);
    `));
  }

  console.log("4/7 Assigning all existing rows to Dleventh Clinic (org id=1)…");
  for (const table of tables) {
    await db.execute(sql.raw(`UPDATE ${table} SET organisation_id = 1;`));
  }

  console.log("5/7 Making organisation_id NOT NULL…");
  for (const table of tables) {
    await db.execute(sql.raw(`
      ALTER TABLE ${table} ALTER COLUMN organisation_id SET NOT NULL;
    `));
  }

  console.log("6/7 Dropping old global unique constraints…");
  await db.execute(sql`ALTER TABLE users       DROP CONSTRAINT IF EXISTS users_email_key;`);
  await db.execute(sql`ALTER TABLE users       DROP CONSTRAINT IF EXISTS users_username_key;`);
  await db.execute(sql`ALTER TABLE roles       DROP CONSTRAINT IF EXISTS roles_name_key;`);
  await db.execute(sql`ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_name_key;`);

  console.log("7/7 Creating per-org composite unique indexes…");
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_org_idx
      ON users(email, organisation_id);
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS users_username_org_idx
      ON users(username, organisation_id);
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS roles_name_org_idx
      ON roles(name, organisation_id);
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS departments_name_org_idx
      ON departments(name, organisation_id);
  `);

  console.log("Done ✓  All existing data preserved under Dleventh Clinic (id=1).");
  process.exit(0);
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
