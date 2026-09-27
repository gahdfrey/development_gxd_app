import { db } from "@/lib/db";
import { wallets, walletTransactions, type Wallet } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class InsufficientBalanceError extends Error {
  constructor() {
    super("Insufficient wallet balance");
    this.name = "InsufficientBalanceError";
  }
}

export type WalletMovementSource =
  | "topup"
  | "bill_payment"
  | "subscription_charge"
  | "refund"
  | "adjustment";

interface MovementInput {
  walletId: number;
  patientId: number;
  organisationId: number;
  amount: number;
  source: WalletMovementSource;
  referenceType?: "payment" | "subscription_charge";
  referenceId?: number;
  description?: string;
}

export async function getWalletByPatientId(patientId: number): Promise<Wallet | null> {
  const [wallet] = await db.select().from(wallets).where(eq(wallets.patientId, patientId)).limit(1);
  return wallet ?? null;
}

/**
 * Same as getWalletByPatientId, but self-heals the rare case where wallet
 * creation at patient registration failed or predates the wallet feature —
 * every patient should have exactly one wallet.
 */
export async function getOrCreateWallet(patientId: number, organisationId: number): Promise<Wallet> {
  const existing = await getWalletByPatientId(patientId);
  if (existing) return existing;

  const [created] = await db
    .insert(wallets)
    .values({ organisationId, patientId })
    .onConflictDoNothing({ target: wallets.patientId })
    .returning();

  if (created) return created;

  // Another request created it concurrently between our check and insert.
  const wallet = await getWalletByPatientId(patientId);
  if (!wallet) throw new Error("Failed to get or create wallet");
  return wallet;
}

/**
 * Credits a wallet and records the matching ledger row. Must be called
 * inside a db.transaction alongside whatever else the credit is settling
 * (e.g. flipping a payments row to "success").
 */
export async function creditWallet(tx: Tx, input: MovementInput) {
  const [updated] = await tx
    .update(wallets)
    .set({ balance: sql`${wallets.balance} + ${input.amount}`, updatedAt: new Date() })
    .where(eq(wallets.id, input.walletId))
    .returning();

  if (!updated) throw new Error("Wallet not found");

  const [txnRow] = await tx
    .insert(walletTransactions)
    .values({
      organisationId: input.organisationId,
      walletId: input.walletId,
      patientId: input.patientId,
      type: "credit",
      amount: input.amount,
      balanceAfter: updated.balance,
      source: input.source,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description,
    })
    .returning();

  return { wallet: updated, transaction: txnRow };
}

/**
 * Debits a wallet and records the matching ledger row, atomically. The
 * balance check happens in the UPDATE's WHERE clause (not a separate SELECT)
 * so a race between two concurrent debits can't overdraw the wallet — throws
 * InsufficientBalanceError if the row didn't match. Must be called inside a
 * db.transaction alongside whatever the debit is paying for.
 */
export async function debitWallet(tx: Tx, input: MovementInput) {
  const [updated] = await tx
    .update(wallets)
    .set({ balance: sql`${wallets.balance} - ${input.amount}`, updatedAt: new Date() })
    .where(and(eq(wallets.id, input.walletId), gte(wallets.balance, input.amount)))
    .returning();

  if (!updated) throw new InsufficientBalanceError();

  const [txnRow] = await tx
    .insert(walletTransactions)
    .values({
      organisationId: input.organisationId,
      walletId: input.walletId,
      patientId: input.patientId,
      type: "debit",
      amount: input.amount,
      balanceAfter: updated.balance,
      source: input.source,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      description: input.description,
    })
    .returning();

  return { wallet: updated, transaction: txnRow };
}
