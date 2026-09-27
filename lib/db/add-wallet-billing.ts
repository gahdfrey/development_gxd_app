import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Wallet + subscription billing migration:
 *  1. payments — new method/purpose/confirmed_by columns, gateway_provider
 *     and gateway_reference relaxed to nullable (wallet/bank_transfer
 *     payments don't go through a gateway)
 *  2. wallets — one per patient, balance kept in sync with wallet_transactions
 *  3. wallet_transactions — append-only ledger of wallet balance movements
 *  4. billing_plans — org-defined recurring subscription plans
 *  5. patient_subscriptions — a patient's enrollment in a billing plan
 *  6. subscription_charges — history of each recurring charge attempt
 *  7. backfill: create a wallet for every existing patient that doesn't have one
 */
async function migrate() {
  console.log("Altering payments table...");
  await db.execute(sql`
    ALTER TABLE payments
      ADD COLUMN IF NOT EXISTS method TEXT NOT NULL DEFAULT 'gateway',
      ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'bill',
      ADD COLUMN IF NOT EXISTS confirmed_by INTEGER REFERENCES users(id),
      ALTER COLUMN gateway_provider DROP NOT NULL,
      ALTER COLUMN gateway_reference DROP NOT NULL
  `);

  console.log("Creating wallets table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS wallets (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      balance INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'NGN',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS wallets_patient_idx ON wallets (patient_id)
  `);

  console.log("Creating wallet_transactions table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      wallet_id INTEGER NOT NULL REFERENCES wallets(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      source TEXT NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_idx ON wallet_transactions (wallet_id)
  `);

  console.log("Creating billing_plans table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS billing_plans (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      name TEXT NOT NULL,
      description TEXT,
      amount INTEGER NOT NULL,
      billing_interval TEXT NOT NULL DEFAULT 'monthly',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS billing_plans_org_idx ON billing_plans (organisation_id)
  `);

  console.log("Creating patient_subscriptions table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS patient_subscriptions (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      billing_plan_id INTEGER NOT NULL REFERENCES billing_plans(id),
      status TEXT NOT NULL DEFAULT 'active',
      start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      next_charge_date TIMESTAMPTZ NOT NULL,
      last_charged_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS patient_subscriptions_status_charge_idx
      ON patient_subscriptions (status, next_charge_date)
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS patient_subscriptions_patient_idx ON patient_subscriptions (patient_id)
  `);

  console.log("Creating subscription_charges table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS subscription_charges (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_subscription_id INTEGER NOT NULL REFERENCES patient_subscriptions(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      failure_reason TEXT,
      wallet_transaction_id INTEGER REFERENCES wallet_transactions(id),
      charged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS subscription_charges_subscription_idx
      ON subscription_charges (patient_subscription_id)
  `);

  console.log("Backfilling wallets for existing patients...");
  const result = await db.execute(sql`
    INSERT INTO wallets (organisation_id, patient_id, balance, currency)
    SELECT p.organisation_id, p.id, 0, 'NGN'
    FROM patients p
    LEFT JOIN wallets w ON w.patient_id = p.id
    WHERE w.id IS NULL
    RETURNING id
  `);
  console.log(`Created ${result.length} wallet(s) for existing patients.`);

  console.log("Migration completed successfully.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
