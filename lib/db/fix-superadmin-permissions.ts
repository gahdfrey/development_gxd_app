import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { roles } from "./schema";
import { ilike } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema: { roles } });

const superadminPermissions = {
  dashboard:        { view: true,  add: true,  edit: true,  delete: true,  print: true  },
  patients:         { view: true,  add: true,  edit: true,  delete: true,  print: true  },
  appointments:     { view: true,  add: true,  edit: true,  delete: true,  print: true  },
  "my-appointments":{ view: true,  add: false, edit: false, delete: false, print: false },
  "all-appointments":{ view: true, add: true,  edit: true,  delete: true,  print: true  },
  users:            { view: true,  add: true,  edit: true,  delete: true,  print: true  },
  roles:            { view: true,  add: true,  edit: true,  delete: true,  print: false },
  setup:            { view: true,  add: true,  edit: true,  delete: false, print: false },
  finance:          { view: true,  add: true,  edit: true,  delete: true,  print: true  },
  laboratory:       { view: true,  add: true,  edit: true,  delete: true,  print: true  },
  radiography:      { view: true,  add: true,  edit: true,  delete: true,  print: true  },
  "my-history":     { view: true,  add: false, edit: false, delete: false, print: false },
};

async function main() {
  await db
    .update(roles)
    .set({ permissions: superadminPermissions, updatedAt: new Date() })
    .where(ilike(roles.name, "superadmin"));

  console.log("✅ Superadmin permissions updated.");
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
