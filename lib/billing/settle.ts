import { db } from "@/lib/db";
import { priceBillItems, recordHmoCharges, itemKey, type PricedItem } from "@/lib/billing/pricing";
import { getItemAuthorizations, recordDeskAuthorizationCode } from "@/lib/billing/authorizations";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * The HMO side of settling bill items — call in the same transaction that
 * flips them to paymentStatus "paid":
 *  1. a code typed at the finance desk goes into the authorization log
 *     (approving the pending request, or logging an approved one — including
 *     for an item the HMO had declined, which then bills the HMO again);
 *  2. the HMO's share is recorded as hmo_charges, each linked to the item's
 *     approved authorization and its code.
 * Returns the items as finally priced (a re-authorized item comes back
 * "covered"), so the desk knows what the patient actually paid.
 */
export async function settleHmoItems(
  tx: Tx,
  orgId: number,
  priced: PricedItem[],
  options: { authorizationCode?: string | null; actorId?: number | null } = {},
): Promise<PricedItem[]> {
  let final = priced;
  let covered = priced.filter((p) => p.basis === "covered" && p.hmoAmount > 0);

  if (options.authorizationCode?.trim()) {
    // A code for an item the HMO had declined means it has since approved
    // it: log the approval and re-price, so the HMO is billed after all.
    const reauthorized = priced.filter((p) => p.basis === "auth_declined");
    for (const item of [...covered, ...reauthorized]) {
      await recordDeskAuthorizationCode(tx, orgId, item, options.authorizationCode, options.actorId ?? null);
    }
    if (reauthorized.length > 0) {
      const repriced = await priceBillItems(orgId, reauthorized, tx);
      covered = [...covered, ...[...repriced.values()].filter((p) => p.basis === "covered" && p.hmoAmount > 0)];
      final = priced.map((p) => repriced.get(itemKey(p.itemType, p.itemId)) ?? p);
    }
  }
  if (covered.length === 0) return final;

  const auths = await getItemAuthorizations(tx, orgId, covered);
  const approved = new Map<string, { id: number; code: string | null }>();
  for (const p of covered) {
    const a = auths.get(itemKey(p.itemType, p.itemId));
    if (a?.status === "approved") approved.set(itemKey(p.itemType, p.itemId), { id: a.id, code: a.code });
  }

  await recordHmoCharges(tx, orgId, covered, { authorizations: approved, authorizationCode: options.authorizationCode });
  return final;
}
