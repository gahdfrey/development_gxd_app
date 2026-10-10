import { db } from "@/lib/db";
import { patients, patientMerges, patientIdentifiers, wallets, patientCoverages } from "@/lib/db/schema";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { creditWallet, debitWallet } from "@/lib/wallet";
import { endOtherActiveCoverages, syncPatientMirror } from "@/lib/billing/coverage";
import { syncAllergyStatus } from "@/lib/clinical/summary";
import { scoreMatch } from "@/lib/mpi/match";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Tables moved specially (one wallet per patient) or never re-pointed.
const SKIP_TABLES = new Set(["wallets", "wallet_transactions", "patients"]);
// Demographic fields copied from the merged record when the survivor's is empty.
const FILLABLE = [
  "nin", "email", "maidenName",
  "nextOfKinFirstname", "nextOfKinLastname", "nextOfKinRelationship",
  "nextOfKinAddress", "nextOfKinPhone", "nextOfKinEmail",
] as const;

/** Every table with a patient_id column (so new modules are covered automatically). */
async function patientTables(tx: Tx): Promise<{ table: string; hasOrg: boolean }[]> {
  const rows = (await tx.execute(sql`
    SELECT c.table_name AS table,
      EXISTS (SELECT 1 FROM information_schema.columns o
              WHERE o.table_schema = 'public' AND o.table_name = c.table_name AND o.column_name = 'organisation_id') AS "hasOrg"
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.column_name = 'patient_id'
      AND EXISTS (SELECT 1 FROM information_schema.columns i
                  WHERE i.table_schema = 'public' AND i.table_name = c.table_name AND i.column_name = 'id')
    ORDER BY 1
  `)) as unknown as { table: string; hasOrg: boolean }[];
  return rows.filter((r) => /^[a-z_]+$/.test(r.table) && !SKIP_TABLES.has(r.table));
}

export type MergeOutcome = { error: string; status?: number } | { mergeId: number; moved: Record<string, number>; walletTransfer: number };

/**
 * Merges a duplicate patient record (`mergedId`) into the record being kept
 * (`survivorId`), in one transaction:
 *  - every row in every table with a patient_id is re-pointed (ids recorded
 *    for undo); the merged wallet's balance moves to the survivor's wallet;
 *  - empty survivor demographics (NIN, email, next of kin…) are filled from
 *    the merged record; the merged MRN is kept as a "legacy_mrn" identifier;
 *  - coverage, allergy status are reconciled; the merged record is
 *    soft-deleted with mergedIntoId set.
 * Refused when both records carry different NINs.
 */
export async function mergePatients(
  tx: Tx,
  { orgId, userId, survivorId, mergedId, reason }: { orgId: number; userId: number; survivorId: number; mergedId: number; reason: string | null },
): Promise<MergeOutcome> {
  if (survivorId === mergedId) return { error: "Choose two different records" };
  const both = await tx
    .select()
    .from(patients)
    .where(and(inArray(patients.id, [survivorId, mergedId]), eq(patients.organisationId, orgId), isNull(patients.deletedAt)));
  const survivor = both.find((p) => p.id === survivorId);
  const merged = both.find((p) => p.id === mergedId);
  if (!survivor || !merged) return { error: "Patient not found (or already merged)", status: 404 };
  if (survivor.nin && merged.nin && survivor.nin !== merged.nin) {
    return { error: "These records have different NINs, so they look like different people. If one NIN is wrong, correct it first." };
  }

  const repointed: Record<string, number[]> = {};
  for (const { table, hasOrg } of await patientTables(tx)) {
    const moved = (await tx.execute(sql`
      UPDATE ${sql.identifier(table)} SET patient_id = ${survivorId}
      WHERE patient_id = ${mergedId} ${hasOrg ? sql`AND organisation_id = ${orgId}` : sql``}
      RETURNING id
    `)) as unknown as { id: number }[];
    if (moved.length > 0) repointed[table] = moved.map((m) => m.id);
  }

  // One wallet per patient: move the balance, keep both ledgers.
  let walletTransfer = 0;
  const [mWallet] = await tx.select().from(wallets).where(eq(wallets.patientId, mergedId)).limit(1);
  if (mWallet && mWallet.balance > 0) {
    let [sWallet] = await tx.select().from(wallets).where(eq(wallets.patientId, survivorId)).limit(1);
    if (!sWallet) [sWallet] = await tx.insert(wallets).values({ organisationId: orgId, patientId: survivorId }).returning();
    walletTransfer = mWallet.balance;
    await debitWallet(tx, { walletId: mWallet.id, patientId: mergedId, organisationId: orgId, amount: walletTransfer, source: "adjustment", description: `Moved to record #${survivorId} (duplicate merged)` });
    await creditWallet(tx, { walletId: sWallet.id, patientId: survivorId, organisationId: orgId, amount: walletTransfer, source: "adjustment", description: `From merged duplicate record #${mergedId}` });
  }

  // Fill the survivor's blanks from the merged record.
  const filled: Record<string, unknown> = {};
  for (const f of FILLABLE) {
    if (!survivor[f] && merged[f]) filled[f] = merged[f];
  }
  if (Object.keys(filled).length > 0) {
    await tx.update(patients).set({ ...filled, updatedAt: new Date() }).where(eq(patients.id, survivorId));
  }

  const now = new Date();
  await tx
    .update(patients)
    .set({ deletedAt: now, mergedIntoId: survivorId, mergedAt: now, updatedAt: now })
    .where(eq(patients.id, mergedId));

  const [record] = await tx
    .insert(patientMerges)
    .values({
      organisationId: orgId,
      survivorId,
      mergedId,
      reason,
      matchScore: scoreMatch(survivor, merged).score,
      repointed,
      snapshot: {
        merged: { ...merged, createdAt: merged.createdAt.toISOString(), updatedAt: merged.updatedAt.toISOString() },
        survivorBefore: Object.fromEntries(Object.keys(filled).map((f) => [f, survivor[f as keyof typeof survivor] ?? null])),
        filledFields: Object.keys(filled),
      },
      walletTransfer,
      mergedBy: userId,
    })
    .returning({ id: patientMerges.id });

  if (merged.mrn) {
    await tx.insert(patientIdentifiers).values({
      organisationId: orgId,
      patientId: survivorId,
      system: "legacy_mrn",
      value: merged.mrn,
      notes: `MRN of duplicate record merged on ${now.toLocaleDateString("en-GB")}`,
      sourceMergeId: record.id,
      createdBy: userId,
    });
  }

  // Only one active HMO coverage: keep the survivor's most recent.
  const active = await tx
    .select({ id: patientCoverages.id })
    .from(patientCoverages)
    .where(and(eq(patientCoverages.patientId, survivorId), eq(patientCoverages.status, "active"), isNull(patientCoverages.deletedAt)))
    .orderBy(desc(patientCoverages.updatedAt));
  if (active.length > 1) await endOtherActiveCoverages(tx, survivorId, active[0].id);
  await syncPatientMirror(tx, survivorId);
  await syncAllergyStatus(tx, survivorId, userId);
  if (survivor.allergyStatus === "not_assessed" && merged.allergyStatus === "nkda") {
    await tx
      .update(patients)
      .set({ allergyStatus: "nkda", allergyStatusUpdatedAt: now, allergyStatusUpdatedBy: userId })
      .where(and(eq(patients.id, survivorId), eq(patients.allergyStatus, "not_assessed")));
  }

  return {
    mergeId: record.id,
    moved: Object.fromEntries(Object.entries(repointed).map(([t, ids]) => [t, ids.length])),
    walletTransfer,
  };
}

/** Reverses a merge: moves exactly the recorded rows back, restores the
 * merged record and the survivor's filled fields, reverses the wallet move. */
export async function undoMerge(
  tx: Tx,
  { orgId, userId, mergeId, reason }: { orgId: number; userId: number; mergeId: number; reason: string },
): Promise<{ error: string; status?: number } | { restoredPatientId: number }> {
  const [m] = await tx
    .select()
    .from(patientMerges)
    .where(and(eq(patientMerges.id, mergeId), eq(patientMerges.organisationId, orgId)))
    .limit(1);
  if (!m) return { error: "Merge not found", status: 404 };
  if (m.undoneAt) return { error: "This merge has already been undone", status: 409 };

  for (const [table, ids] of Object.entries(m.repointed)) {
    if (!/^[a-z_]+$/.test(table) || ids.length === 0) continue;
    await tx.execute(sql`
      UPDATE ${sql.identifier(table)} SET patient_id = ${m.mergedId}
      WHERE patient_id = ${m.survivorId} AND id IN ${sql`(${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`}
    `);
  }

  if (m.walletTransfer && m.walletTransfer > 0) {
    const [sWallet] = await tx.select().from(wallets).where(eq(wallets.patientId, m.survivorId)).limit(1);
    const [mWallet] = await tx.select().from(wallets).where(eq(wallets.patientId, m.mergedId)).limit(1);
    if (sWallet && mWallet) {
      if (sWallet.balance < m.walletTransfer) {
        return { error: `The kept record's wallet has only ₦${sWallet.balance.toLocaleString()} left, less than the ₦${m.walletTransfer.toLocaleString()} moved at merge. Refund or adjust first.` };
      }
      await debitWallet(tx, { walletId: sWallet.id, patientId: m.survivorId, organisationId: orgId, amount: m.walletTransfer, source: "adjustment", description: `Merge #${m.id} undone` });
      await creditWallet(tx, { walletId: mWallet.id, patientId: m.mergedId, organisationId: orgId, amount: m.walletTransfer, source: "adjustment", description: `Merge #${m.id} undone` });
    }
  }

  const snap = m.snapshot as { survivorBefore?: Record<string, unknown> };
  if (snap.survivorBefore && Object.keys(snap.survivorBefore).length > 0) {
    await tx.update(patients).set({ ...snap.survivorBefore, updatedAt: new Date() }).where(eq(patients.id, m.survivorId));
  }
  await tx
    .update(patients)
    .set({ deletedAt: null, mergedIntoId: null, mergedAt: null, updatedAt: new Date() })
    .where(eq(patients.id, m.mergedId));
  await tx
    .update(patientIdentifiers)
    .set({ deletedAt: new Date() })
    .where(and(eq(patientIdentifiers.sourceMergeId, m.id), isNull(patientIdentifiers.deletedAt)));
  await tx
    .update(patientMerges)
    .set({ undoneAt: new Date(), undoneBy: userId, undoReason: reason })
    .where(eq(patientMerges.id, m.id));

  for (const id of [m.survivorId, m.mergedId]) {
    await syncPatientMirror(tx, id);
    await syncAllergyStatus(tx, id, userId);
  }
  return { restoredPatientId: m.mergedId };
}
