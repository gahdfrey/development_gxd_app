import "dotenv/config";
import { db } from "./index";
import { sql } from "drizzle-orm";

/**
 * Per-organisation HMOs + payer enrollee records:
 *  1. hmos gains organisation_id (plus payer master fields). The old global
 *     list is split so every organisation gets its own copy of each HMO, and
 *     every reference (patients, price_lists, hmo_charges) is re-pointed to
 *     the copy owned by the referencing row's organisation. Name uniqueness
 *     becomes per-org (case-insensitive, non-deleted rows only).
 *  2. patient_coverages — a patient's enrolment with a payer (membership
 *     number, plan, principal/dependant, validity), backfilled from the
 *     existing patients.hmo_id / policy_number.
 *  3. eligibility_checks — log of every enrollee verification.
 *  4. hmo_charges.coverage_id, organisations.eligibility_recheck_days.
 *
 * Safe to re-run: the split only touches HMOs that have no organisation yet,
 * and the backfill skips patients who already have a coverage row.
 */
async function migrate() {
  console.log("Adding organisations.eligibility_recheck_days...");
  await db.execute(sql`
    ALTER TABLE organisations
      ADD COLUMN IF NOT EXISTS eligibility_recheck_days INTEGER NOT NULL DEFAULT 30
  `);

  console.log("Adding payer columns to hmos...");
  await db.execute(sql`
    ALTER TABLE hmos
      ADD COLUMN IF NOT EXISTS organisation_id INTEGER REFERENCES organisations(id),
      ADD COLUMN IF NOT EXISTS payer_type TEXT NOT NULL DEFAULT 'hmo',
      ADD COLUMN IF NOT EXISTS code TEXT,
      ADD COLUMN IF NOT EXISTS contact_person TEXT,
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS email TEXT,
      ADD COLUMN IF NOT EXISTS claim_submission_days INTEGER
  `);
  // The global unique name must go before per-org copies can share a name.
  await db.execute(sql`ALTER TABLE hmos DROP CONSTRAINT IF EXISTS hmos_name_unique`);
  await db.execute(sql`DROP INDEX IF EXISTS hmos_name_unique`);

  console.log("Splitting the global HMO list per organisation...");
  await db.transaction(async (tx) => {
    const orgs = (await tx.execute(sql`SELECT id FROM organisations ORDER BY id`)) as unknown as { id: number }[];
    const originals = (await tx.execute(sql`
      SELECT id, name, description, payer_type, created_at, deleted_at
      FROM hmos WHERE organisation_id IS NULL ORDER BY id
    `)) as unknown as {
      id: number; name: string; description: string | null; payer_type: string;
      created_at: Date; deleted_at: Date | null;
    }[];

    if (orgs.length === 0 || originals.length === 0) return;

    for (const h of originals) {
      // Orgs that already reference this HMO somewhere.
      const refRows = (await tx.execute(sql`
        SELECT organisation_id FROM patients WHERE hmo_id = ${h.id}
        UNION SELECT organisation_id FROM price_lists WHERE hmo_id = ${h.id}
        UNION SELECT organisation_id FROM hmo_charges WHERE hmo_id = ${h.id}
      `)) as unknown as { organisation_id: number }[];
      const referencing = new Set(refRows.map((r) => r.organisation_id));

      // Live HMOs go to every org (each org saw the whole list before);
      // deleted ones only to orgs that still reference them.
      const targets = orgs.map((o) => o.id).filter((id) => h.deleted_at == null || referencing.has(id));
      if (targets.length === 0) {
        // Deleted and unreferenced: park it on the first org so the column
        // can become NOT NULL. It stays soft-deleted.
        await tx.execute(sql`UPDATE hmos SET organisation_id = ${orgs[0].id} WHERE id = ${h.id}`);
        continue;
      }

      // The original row is kept by the lowest referencing org (so most
      // existing ids stay valid), else the first target org.
      const owner = [...referencing].sort((a, b) => a - b)[0] ?? targets[0];
      await tx.execute(sql`UPDATE hmos SET organisation_id = ${owner} WHERE id = ${h.id}`);

      for (const orgId of targets) {
        if (orgId === owner) continue;
        const [clone] = (await tx.execute(sql`
          INSERT INTO hmos (organisation_id, name, description, payer_type, created_at, updated_at, deleted_at)
          VALUES (${orgId}, ${h.name}, ${h.description}, ${h.payer_type}, ${h.created_at}, NOW(), ${h.deleted_at})
          RETURNING id
        `)) as unknown as { id: number }[];
        if (referencing.has(orgId)) {
          await tx.execute(sql`UPDATE patients SET hmo_id = ${clone.id} WHERE hmo_id = ${h.id} AND organisation_id = ${orgId}`);
          await tx.execute(sql`UPDATE price_lists SET hmo_id = ${clone.id} WHERE hmo_id = ${h.id} AND organisation_id = ${orgId}`);
          await tx.execute(sql`UPDATE hmo_charges SET hmo_id = ${clone.id} WHERE hmo_id = ${h.id} AND organisation_id = ${orgId}`);
        }
      }
      console.log(`  "${h.name}": kept by org ${owner}, copied to ${targets.length - 1} other org(s)`);
    }
  });

  await db.execute(sql`ALTER TABLE hmos ALTER COLUMN organisation_id SET NOT NULL`);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS hmos_org_name_idx
      ON hmos (organisation_id, lower(name)) WHERE deleted_at IS NULL
  `);

  console.log("Creating patient_coverages table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS patient_coverages (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      hmo_id INTEGER NOT NULL REFERENCES hmos(id),
      plan_name TEXT,
      membership_number TEXT,
      relationship TEXT NOT NULL DEFAULT 'principal',
      principal_name TEXT,
      principal_membership_number TEXT,
      primary_provider TEXT,
      valid_from TEXT,
      valid_to TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS patient_coverages_patient_idx ON patient_coverages (patient_id)
  `);

  console.log("Creating eligibility_checks table...");
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS eligibility_checks (
      id SERIAL PRIMARY KEY,
      organisation_id INTEGER NOT NULL REFERENCES organisations(id),
      coverage_id INTEGER NOT NULL REFERENCES patient_coverages(id),
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      channel TEXT NOT NULL,
      result TEXT NOT NULL,
      reference TEXT,
      notes TEXT,
      checked_by INTEGER REFERENCES users(id),
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS eligibility_checks_coverage_idx ON eligibility_checks (coverage_id, checked_at)
  `);

  console.log("Adding hmo_charges.coverage_id...");
  await db.execute(sql`
    ALTER TABLE hmo_charges ADD COLUMN IF NOT EXISTS coverage_id INTEGER REFERENCES patient_coverages(id)
  `);

  console.log("Backfilling coverages from patients.hmo_id / policy_number...");
  const backfilled = (await db.execute(sql`
    INSERT INTO patient_coverages (organisation_id, patient_id, hmo_id, membership_number, status)
    SELECT p.organisation_id, p.id, p.hmo_id, NULLIF(TRIM(p.policy_number), ''), 'active'
    FROM patients p
    WHERE p.insurance_type = 'hmo'
      AND p.hmo_id IS NOT NULL
      AND p.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM patient_coverages c WHERE c.patient_id = p.id)
    RETURNING id
  `)) as unknown as { id: number }[];
  console.log(`  ${backfilled.length} coverage(s) created`);

  console.log("Org-scoped HMOs + coverages migration complete.");
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
