import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

/**
 * Applies pending SQL migrations from drizzle/ (the ones `npm run db:generate`
 * writes). `npm run build` runs this first, so a production deploy updates the
 * database before the new code goes live; if a migration fails, the build
 * fails and the previous deployment keeps serving.
 *
 * On Vercel it only runs for production builds: Preview shares the production
 * database, so an unmerged branch must never migrate it. Off Vercel it runs
 * against whatever DATABASE_URL points at (`npm run db:migrate`).
 */
const vercelEnv = process.env.VERCEL_ENV;
if (vercelEnv && vercelEnv !== "production") {
  console.log(`[migrate] Skipping: ${vercelEnv} build (migrations only run for production).`);
  process.exit(0);
}

// DDL is safest over a direct connection; the Neon integration provides one.
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set.");
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
const appliedCount = () =>
  client`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`.then(
    (r) => r[0].n,
    () => 0, // table doesn't exist yet on a brand-new database
  );
try {
  console.log(`[migrate] Checking ${new URL(url).hostname} for pending migrations...`);
  const before = await appliedCount();
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  const applied = (await appliedCount()) - before;
  console.log(applied ? `[migrate] Applied ${applied} migration(s).` : "[migrate] Nothing to apply; database is up to date.");
} catch (err) {
  console.error("[migrate] Migration failed:", err);
  process.exitCode = 1;
} finally {
  await client.end();
}
