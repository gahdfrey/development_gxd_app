/**
 * Migration script: copies all data from LOCAL db to PRODUCTION (Neon) db.
 * Usage:
 *   LOCAL_DB_URL="..." PROD_DB_URL="..." npx tsx lib/db/migrate-to-prod.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const localUrl = process.env.LOCAL_DB_URL;
const prodUrl = process.env.PROD_DB_URL;

if (!localUrl) throw new Error('LOCAL_DB_URL is required');
if (!prodUrl) throw new Error('PROD_DB_URL is required');

const localClient = postgres(localUrl);
const prodClient = postgres(prodUrl);

const localDb = drizzle(localClient, { schema });
const prodDb = drizzle(prodClient, { schema });

async function migrate() {
  console.log('📦 Reading all data from local database...\n');

  const roles        = await localDb.select().from(schema.roles);
  const hmos         = await localDb.select().from(schema.hmos);
  const users        = await localDb.select().from(schema.users);
  const patients     = await localDb.select().from(schema.patients);
  const departments  = await localDb.select().from(schema.departments);
  const labTests     = await localDb.select().from(schema.labTests);
  const appointments = await localDb.select().from(schema.appointments);
  const visits       = await localDb.select().from(schema.visits);
  const requests     = await localDb.select().from(schema.requests);
  const requestResults = await localDb.select().from(schema.requestResults);
  const notifications  = await localDb.select().from(schema.notifications);

  console.log(`  roles:           ${roles.length}`);
  console.log(`  hmos:            ${hmos.length}`);
  console.log(`  users:           ${users.length}`);
  console.log(`  patients:        ${patients.length}`);
  console.log(`  departments:     ${departments.length}`);
  console.log(`  lab_tests:       ${labTests.length}`);
  console.log(`  appointments:    ${appointments.length}`);
  console.log(`  visits:          ${visits.length}`);
  console.log(`  requests:        ${requests.length}`);
  console.log(`  request_results: ${requestResults.length}`);
  console.log(`  notifications:   ${notifications.length}`);

  console.log('\n🗑️  Clearing production tables (respecting FK order)...');

  await prodDb.delete(schema.notifications);
  await prodDb.delete(schema.requestResults);
  await prodDb.delete(schema.requests);
  await prodDb.delete(schema.visits);
  await prodDb.delete(schema.appointments);
  await prodDb.delete(schema.labTests);
  await prodDb.delete(schema.users);
  await prodDb.delete(schema.patients);
  await prodDb.delete(schema.departments);
  await prodDb.delete(schema.hmos);
  await prodDb.delete(schema.roles);

  console.log('✅ Production tables cleared.\n');

  // Reset sequences so IDs match local
  const tables = [
    'roles', 'hmos', 'users', 'patients', 'departments',
    'lab_tests', 'appointments', 'visits', 'requests',
    'request_results', 'notifications',
  ];
  for (const table of tables) {
    await prodClient`SELECT setval(pg_get_serial_sequence(${table}, 'id'), 1, false)`;
  }

  console.log('🚀 Inserting data into production...\n');

  const insert = async <T extends Record<string, unknown>>(
    label: string,
    table: Parameters<typeof prodDb.insert>[0],
    rows: T[]
  ) => {
    if (rows.length === 0) { console.log(`  ⏭️  ${label}: empty, skipping`); return; }
    // Insert in chunks of 100 to avoid query size limits
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      await prodDb.insert(table).values(rows.slice(i, i + chunkSize) as T[]);
    }
    console.log(`  ✅ ${label}: ${rows.length} rows`);
  };

  await insert('roles',           schema.roles,          roles);
  await insert('hmos',            schema.hmos,           hmos);
  await insert('departments',     schema.departments,    departments);
  await insert('users',           schema.users,          users);
  await insert('patients',        schema.patients,       patients);
  await insert('lab_tests',       schema.labTests,       labTests);
  await insert('appointments',    schema.appointments,   appointments);
  await insert('visits',          schema.visits,         visits);
  await insert('requests',        schema.requests,       requests);
  await insert('request_results', schema.requestResults, requestResults);
  await insert('notifications',   schema.notifications,  notifications);

  // Bump sequences to max id so future inserts don't collide
  console.log('\n🔢 Resetting sequences to max IDs...');
  const seqTables: [string, number][] = [
    ['roles',            Math.max(0, ...roles.map(r => r.id))],
    ['hmos',             Math.max(0, ...hmos.map(r => r.id))],
    ['users',            Math.max(0, ...users.map(r => r.id))],
    ['patients',         Math.max(0, ...patients.map(r => r.id))],
    ['departments',      Math.max(0, ...departments.map(r => r.id))],
    ['lab_tests',        Math.max(0, ...labTests.map(r => r.id))],
    ['appointments',     Math.max(0, ...appointments.map(r => r.id))],
    ['visits',           Math.max(0, ...visits.map(r => r.id))],
    ['requests',         Math.max(0, ...requests.map(r => r.id))],
    ['request_results',  Math.max(0, ...requestResults.map(r => r.id))],
    ['notifications',    Math.max(0, ...notifications.map(r => r.id))],
  ];
  for (const [table, maxId] of seqTables) {
    if (maxId > 0) {
      await prodClient`SELECT setval(pg_get_serial_sequence(${table}, 'id'), ${maxId})`;
    }
  }

  console.log('\n🎉 Migration complete! All local data is now in production.');

  await localClient.end();
  await prodClient.end();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
