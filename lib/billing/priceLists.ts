import { db } from "@/lib/db";
import { priceLists } from "@/lib/db/schema";
import { and, eq, isNull, ne, or, gte, lte } from "drizzle-orm";

export const PAYER_TYPES = ["hmo", "nhia", "state_scheme", "corporate"] as const;
export type PayerType = (typeof PAYER_TYPES)[number];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface PriceListHeaderInput {
  name?: unknown;
  payerType?: unknown;
  hmoId?: unknown;
  effectiveFrom?: unknown;
  effectiveTo?: unknown;
  isActive?: unknown;
  notes?: unknown;
}

export type ValidatedHeader = {
  name: string;
  payerType: PayerType;
  hmoId: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  isActive: boolean;
  notes: string | null;
};

/** Validates a full price-list header (create, or a PATCH merged onto the
 * existing row). Returns an error message or the cleaned values. */
export function validatePriceListHeader(input: PriceListHeaderInput): { error: string } | { value: ValidatedHeader } {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { error: "Price list name is required" };

  const payerType = (input.payerType ?? "hmo") as PayerType;
  if (!PAYER_TYPES.includes(payerType)) return { error: "Invalid payer type" };

  const hmoId = Number(input.hmoId);
  if (!Number.isInteger(hmoId) || hmoId <= 0) return { error: "Select the HMO / scheme this price list belongs to" };

  const effectiveFrom = typeof input.effectiveFrom === "string" ? input.effectiveFrom : "";
  if (!DATE_RE.test(effectiveFrom)) return { error: "Effective-from date is required" };

  const effectiveTo = typeof input.effectiveTo === "string" && input.effectiveTo !== "" ? input.effectiveTo : null;
  if (effectiveTo !== null && !DATE_RE.test(effectiveTo)) return { error: "Invalid effective-to date" };
  if (effectiveTo !== null && effectiveTo < effectiveFrom) {
    return { error: "Effective-to date can't be before the effective-from date" };
  }

  const notes = typeof input.notes === "string" && input.notes.trim() !== "" ? input.notes.trim() : null;

  return {
    value: {
      name,
      payerType,
      hmoId,
      effectiveFrom,
      effectiveTo,
      isActive: input.isActive === undefined ? true : input.isActive === true,
      notes,
    },
  };
}

/**
 * Two active price lists for the same HMO with overlapping date ranges would
 * make the tariff ambiguous, so they're rejected up front. Returns the
 * clashing list's name, or null if there's no overlap.
 */
export async function findOverlappingPriceList(
  orgId: number,
  header: Pick<ValidatedHeader, "hmoId" | "effectiveFrom" | "effectiveTo">,
  excludeId?: number,
): Promise<string | null> {
  const conditions = [
    eq(priceLists.organisationId, orgId),
    eq(priceLists.hmoId, header.hmoId),
    eq(priceLists.isActive, true),
    isNull(priceLists.deletedAt),
    // Ranges [a.from, a.to] and [b.from, b.to] overlap when
    // a.from <= b.to AND b.from <= a.to (null "to" = open-ended).
    or(isNull(priceLists.effectiveTo), gte(priceLists.effectiveTo, header.effectiveFrom)),
  ];
  if (header.effectiveTo) conditions.push(lte(priceLists.effectiveFrom, header.effectiveTo));
  if (excludeId) conditions.push(ne(priceLists.id, excludeId));

  const [clash] = await db
    .select({ name: priceLists.name })
    .from(priceLists)
    .where(and(...conditions))
    .limit(1);
  return clash?.name ?? null;
}
