import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

/**
 * Singleton connection pool.
 * - Reuses the same pool across hot-reloads in dev (avoids "too many connections").
 * - In production the module is loaded once so globalThis isn't needed,
 *   but it doesn't hurt.
 */
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: postgres.Sql | undefined;
}

const client =
  globalThis._pgPool ??
  postgres(connectionString, {
    max: 10,            // max connections in pool
    idle_timeout: 20,   // close idle connections after 20 s
    connect_timeout: 10, // fail fast on bad DB URL
    prepare: false,     // required for PgBouncer / serverless proxies
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis._pgPool = client;
}

export const db = drizzle(client, { schema });
