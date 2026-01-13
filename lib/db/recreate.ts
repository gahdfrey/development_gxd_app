import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

async function recreateTables() {
  console.log("Dropping existing tables...");
  await db.execute(sql`DROP TABLE IF EXISTS appointments CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS patients CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS roles CASCADE`);
  console.log("Tables dropped.");

  console.log("Creating roles table...");
  await db.execute(sql`
        CREATE TABLE IF NOT EXISTS roles (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            permissions JSON,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);

  console.log("Creating users table...");
  await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            firstname TEXT NOT NULL,
            lastname TEXT NOT NULL,
            password TEXT NOT NULL,
            role_id INTEGER REFERENCES roles(id),
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);

  console.log("Creating patients table...");
  await db.execute(sql`
        CREATE TABLE IF NOT EXISTS patients (
            id SERIAL PRIMARY KEY,
            firstname TEXT NOT NULL,
            lastname TEXT NOT NULL,
            gender TEXT NOT NULL,
            dob TEXT NOT NULL,
            maiden_name TEXT,
            country_code TEXT NOT NULL,
            phone TEXT NOT NULL,
            insurance_type TEXT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);

  console.log("Creating appointments table...");
  await db.execute(sql`
        CREATE TABLE IF NOT EXISTS appointments (
            id SERIAL PRIMARY KEY,
            patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            doctor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            appointment_date TEXT NOT NULL,
            appointment_time TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'scheduled',
            notes TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
    `);

  console.log("All tables recreated successfully.");
  process.exit(0);
}

recreateTables().catch((err) => {
  console.error("Failed to recreate tables:", err);
  process.exit(1);
});
