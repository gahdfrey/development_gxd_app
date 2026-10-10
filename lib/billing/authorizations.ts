import { db } from "@/lib/db";
import { hmoAuthorizations, hmoAuthorizationItems } from "@/lib/db/schema";
import { and, desc, eq, gte, inArray, isNull, ne, or } from "drizzle-orm";
import { priceBillItems, itemKey, type BillItemRef, type PricedItem } from "@/lib/billing/pricing";
import { logAudit } from "@/lib/audit";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

/** NHIA: HMOs must respond to pre-authorization requests within one hour. */
export const AUTH_SLA_MINUTES = 60;

export const AUTH_CHANNELS = ["phone", "whatsapp", "email", "hmo_portal", "other"] as const;
export type AuthStatus = "pending" | "approved" | "denied" | "cancelled";

export interface ItemAuthorization {
  id: number;
  status: AuthStatus;
  code: string | null;
  validUntil: string | null;
  requestedAt: Date;
  sentAt: Date | null;
  respondedAt: Date | null;
  isEmergency: boolean;
}

/** How long an auto-raised, still-unsent request keeps collecting the
 * patient's further orders before a new one is started. */
const MERGE_WINDOW_MS = 2 * 60 * 60 * 1000;

/**
 * HMO response time: minutes from sending to the HMO until its response (or
 * until now, while still waiting), and whether that broke the one-hour SLA.
 * Null while the request hasn't been sent (the delay is then the hospital's,
 * not the HMO's). Responses recorded at the desk with no send time (codes
 * obtained on the spot) don't count against the HMO either.
 */
export function authorizationSla(a: { status: string; sentAt: Date | string | null; respondedAt: Date | string | null }) {
  if (!a.sentAt) return null;
  const start = new Date(a.sentAt).getTime();
  const end = a.respondedAt ? new Date(a.respondedAt).getTime() : Date.now();
  const minutes = Math.max(0, Math.floor((end - start) / 60_000));
  const counts = a.status === "pending" || a.respondedAt != null;
  return { minutes, breached: counts && minutes > AUTH_SLA_MINUTES };
}

/**
 * The authorization that currently applies to each bill item: the newest
 * one that isn't cancelled. Keyed by itemKey(itemType, itemId).
 */
export async function getItemAuthorizations(
  executor: Executor,
  orgId: number,
  refs: BillItemRef[],
): Promise<Map<string, ItemAuthorization>> {
  const result = new Map<string, ItemAuthorization>();
  if (refs.length === 0) return result;

  const requestIds = refs.filter((r) => r.itemType === "request").map((r) => r.itemId);
  const prescriptionIds = refs.filter((r) => r.itemType === "prescription").map((r) => r.itemId);
  const itemConditions = [];
  if (requestIds.length > 0) {
    itemConditions.push(and(eq(hmoAuthorizationItems.itemType, "request"), inArray(hmoAuthorizationItems.itemId, requestIds)));
  }
  if (prescriptionIds.length > 0) {
    itemConditions.push(and(eq(hmoAuthorizationItems.itemType, "prescription"), inArray(hmoAuthorizationItems.itemId, prescriptionIds)));
  }
  const chargeIds = refs.filter((r) => r.itemType === "charge").map((r) => r.itemId);
  if (chargeIds.length > 0) {
    itemConditions.push(and(eq(hmoAuthorizationItems.itemType, "charge"), inArray(hmoAuthorizationItems.itemId, chargeIds)));
  }

  const rows = await executor
    .select({
      itemType: hmoAuthorizationItems.itemType,
      itemId: hmoAuthorizationItems.itemId,
      id: hmoAuthorizations.id,
      status: hmoAuthorizations.status,
      code: hmoAuthorizations.code,
      validUntil: hmoAuthorizations.validUntil,
      requestedAt: hmoAuthorizations.requestedAt,
      sentAt: hmoAuthorizations.sentAt,
      respondedAt: hmoAuthorizations.respondedAt,
      isEmergency: hmoAuthorizations.isEmergency,
    })
    .from(hmoAuthorizationItems)
    .innerJoin(hmoAuthorizations, eq(hmoAuthorizationItems.authorizationId, hmoAuthorizations.id))
    .where(and(
      eq(hmoAuthorizations.organisationId, orgId),
      ne(hmoAuthorizations.status, "cancelled"),
      or(...itemConditions),
    ))
    .orderBy(desc(hmoAuthorizations.requestedAt), desc(hmoAuthorizations.id));

  for (const r of rows) {
    const k = itemKey(r.itemType as BillItemRef["itemType"], r.itemId);
    if (!result.has(k)) {
      result.set(k, {
        id: r.id,
        status: r.status as AuthStatus,
        code: r.code,
        validUntil: r.validUntil,
        requestedAt: r.requestedAt,
        sentAt: r.sentAt,
        respondedAt: r.respondedAt,
        isEmergency: r.isEmergency,
      });
    }
  }
  return result;
}

interface CreateAuthorizationInput {
  orgId: number;
  actorId: number | null;
  items: PricedItem[]; // all for the same patient + coverage
  source: "auto" | "manual";
  channel?: string | null;
  isEmergency?: boolean;
  notes?: string | null;
  /** Already sent to the HMO (manual requests made on the spot). */
  sent?: boolean;
  /** Record it as already approved (e.g. code obtained by phone at the desk). */
  approved?: { code: string; validUntil?: string | null };
}

/** Creates one authorization (pending, or already approved) covering items. */
export async function createAuthorization(executor: Executor, input: CreateAuthorizationInput) {
  const first = input.items[0];
  if (!first || first.coverageId == null || first.hmoId == null) {
    throw new Error("Authorization items must belong to a covered HMO patient");
  }
  const now = new Date();
  const [auth] = await executor
    .insert(hmoAuthorizations)
    .values({
      organisationId: input.orgId,
      patientId: first.patientId,
      coverageId: first.coverageId,
      hmoId: first.hmoId,
      status: input.approved ? "approved" : "pending",
      source: input.source,
      channel: input.channel ?? null,
      isEmergency: input.isEmergency ?? false,
      requestedBy: input.actorId,
      requestedAt: now,
      sentAt: input.sent ? now : null,
      sentBy: input.sent ? input.actorId : null,
      code: input.approved?.code ?? null,
      validUntil: input.approved?.validUntil ?? null,
      respondedAt: input.approved ? now : null,
      respondedBy: input.approved ? input.actorId : null,
      notes: input.notes ?? null,
    })
    .returning();
  await executor.insert(hmoAuthorizationItems).values(
    input.items.map((i) => ({
      authorizationId: auth.id,
      itemType: i.itemType,
      itemId: i.itemId,
      description: i.description,
      tariffPrice: i.tariffPrice ?? i.price,
    })),
  );
  return auth;
}

/**
 * Called after clinicians order lab/imaging tests or prescriptions: any
 * newly ordered item that the patient's HMO tariff marks "requires
 * authorization" gets a pending, not-yet-sent authorization — added to the
 * patient's open unsent request if there is one — so it shows on the finance
 * desk's worklist straight away. The one-hour SLA clock starts when finance
 * marks it sent. Never throws — an authorization bookkeeping failure must
 * not block a clinical order.
 */
export async function raiseAuthorizationsForOrders(orgId: number, refs: BillItemRef[], actorId: number | null): Promise<void> {
  try {
    if (refs.length === 0) return;
    const priced = await priceBillItems(orgId, refs);
    const needing = [...priced.values()].filter(
      (p) => p.basis === "covered" && p.requiresAuthorization && p.coverageId != null,
    );
    if (needing.length === 0) return;

    const existing = await getItemAuthorizations(db, orgId, needing);
    // Declined items price as "auth_declined" so never reach here; finance
    // re-requests those deliberately from the Authorizations tab.
    const fresh = needing.filter((p) => !existing.get(itemKey(p.itemType, p.itemId)));
    if (fresh.length === 0) return;

    const byCoverage = new Map<number, PricedItem[]>();
    for (const p of fresh) {
      const list = byCoverage.get(p.coverageId as number) ?? [];
      list.push(p);
      byCoverage.set(p.coverageId as number, list);
    }
    for (const [coverageId, items] of byCoverage) {
      // Add to the patient's open, not-yet-sent request if there's a recent
      // one, so a consultation's orders go to the HMO as one request.
      const [open] = await db
        .select({ id: hmoAuthorizations.id })
        .from(hmoAuthorizations)
        .where(and(
          eq(hmoAuthorizations.organisationId, orgId),
          eq(hmoAuthorizations.coverageId, coverageId),
          eq(hmoAuthorizations.status, "pending"),
          isNull(hmoAuthorizations.sentAt),
          gte(hmoAuthorizations.requestedAt, new Date(Date.now() - MERGE_WINDOW_MS)),
        ))
        .orderBy(desc(hmoAuthorizations.requestedAt))
        .limit(1);
      if (open) {
        await db
          .insert(hmoAuthorizationItems)
          .values(items.map((i) => ({
            authorizationId: open.id,
            itemType: i.itemType,
            itemId: i.itemId,
            description: i.description,
            tariffPrice: i.tariffPrice ?? i.price,
          })))
          .onConflictDoNothing();
        await db.update(hmoAuthorizations).set({ updatedAt: new Date() }).where(eq(hmoAuthorizations.id, open.id));
        continue;
      }
      const auth = await db.transaction((tx) => createAuthorization(tx, { orgId, actorId, items, source: "auto" }));
      void logAudit({
        organisationId: orgId,
        userId: actorId,
        action: "create",
        entityType: "hmo_authorization",
        entityId: auth.id,
        details: { source: "auto", patientId: auth.patientId, hmoId: auth.hmoId, items: items.map((i) => itemKey(i.itemType, i.itemId)) },
      });
    }
  } catch (err) {
    console.error("Failed to raise HMO authorizations:", err);
  }
}

/**
 * Finance desk typed an authorization code while settling an item. Records
 * it in the authorization log: approves the item's pending authorization
 * with that code, or — if none exists — logs an already-approved one, so
 * every code on a claim traces back to a log entry.
 */
export async function recordDeskAuthorizationCode(
  executor: Executor,
  orgId: number,
  item: PricedItem,
  code: string,
  actorId: number | null,
): Promise<void> {
  const trimmed = code.trim();
  // auth_declined: the HMO has since reconsidered and given a code.
  if (!trimmed || (item.basis !== "covered" && item.basis !== "auth_declined") || item.coverageId == null) return;

  const current = (await getItemAuthorizations(executor, orgId, [item])).get(itemKey(item.itemType, item.itemId));
  if (current?.status === "pending") {
    await executor
      .update(hmoAuthorizations)
      .set({ status: "approved", code: trimmed, respondedAt: new Date(), respondedBy: actorId, updatedAt: new Date() })
      .where(eq(hmoAuthorizations.id, current.id));
    return;
  }
  if (current?.status === "approved" && current.code === trimmed) return;
  await createAuthorization(executor, {
    orgId,
    actorId,
    items: [item],
    source: "manual",
    channel: "other",
    notes: "Code entered at the finance desk when settling the bill",
    approved: { code: trimmed },
  });
}

/** The client-facing slice of an item's authorization for finance tables. */
export function toAuthorizationSummary(a: ItemAuthorization | undefined) {
  if (!a) return null;
  return {
    id: a.id,
    status: a.status,
    code: a.code,
    validUntil: a.validUntil,
    sentAt: a.sentAt,
    respondedAt: a.respondedAt,
    sla: authorizationSla(a),
  };
}
