import { db } from "@/lib/db";
import {
  requests,
  prescriptions,
  labTests,
  products,
  priceLists,
  priceListItems,
  hmoCharges,
  hmoAuthorizations,
  hmoAuthorizationItems,
  patientCharges,
  vaccinationDoses,
  vaccinationCourses,
} from "@/lib/db/schema";
import { getActiveCoverages, todayInLagos } from "@/lib/billing/coverage";
import { vatInclusiveAmount } from "@/lib/billing/tax";
import { and, eq, inArray, isNull, lte, gte, or, desc, ne, sql } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

/** request = lab/imaging test, prescription = drug/product, charge = bed day,
 * service or vaccination dose (patient_charges). */
export type BillItemType = "request" | "prescription" | "charge";

export interface BillItemRef {
  itemType: BillItemType;
  itemId: number;
}

/**
 * How an item's price was arrived at:
 *  - "self_pay"   patient has no active, in-date HMO coverage (or no active
 *                 price list for their HMO)
 *  - "covered"    on the HMO's price list and covered — HMO pays, minus co-pay
 *  - "excluded"   on the HMO's price list but explicitly not covered
 *  - "not_listed" HMO patient, but the service isn't on the HMO's tariff
 *  - "auth_declined" on the tariff, but the HMO declined the item's
 *                 pre-authorization (its latest non-cancelled authorization)
 * In the last three cases the patient pays the self-pay (base) price.
 */
export type PricingBasis = "self_pay" | "covered" | "excluded" | "not_listed" | "auth_declined";

export interface PricedItem extends BillItemRef {
  patientId: number;
  description: string | null;
  /** Self-pay price from labTests.price / products.price. Null if unpriced
   * (e.g. a prescription with no brand picked yet). */
  basePrice: number | null;
  /** The price actually charged for the item (HMO tariff when covered). */
  price: number | null;
  /** The HMO's tariff for the item, when it's on the tariff (covered or
   * auth_declined) — what an authorization request is for. */
  tariffPrice: number | null;
  /** VAT treatment of the catalog item and the VAT contained in `price`. */
  taxCode: string;
  vatAmount: number;
  hmoAmount: number;
  patientAmount: number;
  basis: PricingBasis;
  hmoId: number | null;
  hmoName: string | null;
  priceListId: number | null;
  coverageId: number | null;
  /** The enrollee's membership / policy number from their coverage. */
  policyNumber: string | null;
  copayPercent: number;
  requiresAuthorization: boolean;
  /** HMO patients only: no recent "eligible" check within the org's window. */
  eligibilityStale: boolean;
  lastEligibility: { checkedAt: Date; result: string } | null;
}

export const itemKey = (itemType: BillItemType, itemId: number) => `${itemType}:${itemId}`;

/**
 * Prices a set of bill items (lab/imaging requests and prescriptions) for
 * whoever is paying: the patient's HMO tariff when they're HMO-covered and
 * the service is on an active price list, else the self-pay base price.
 * Every caller that shows or charges an amount (finance desk, patient
 * portal checkout, wallet/bank-transfer payments) goes through this so the
 * patient is never asked for the HMO's share.
 *
 * Batched: a fixed handful of queries regardless of how many items.
 */
export async function priceBillItems(
  orgId: number,
  refs: BillItemRef[],
  executor: Executor = db,
): Promise<Map<string, PricedItem>> {
  const result = new Map<string, PricedItem>();
  if (refs.length === 0) return result;

  const requestIds = [...new Set(refs.filter((r) => r.itemType === "request").map((r) => r.itemId))];
  const prescriptionIds = [...new Set(refs.filter((r) => r.itemType === "prescription").map((r) => r.itemId))];
  const chargeIds = [...new Set(refs.filter((r) => r.itemType === "charge").map((r) => r.itemId))];

  const [requestRows, prescriptionRows, chargeRows] = await Promise.all([
    requestIds.length > 0
      ? executor
          .select({
            id: requests.id,
            patientId: requests.patientId,
            catalogId: requests.testId,
            name: labTests.name,
            basePrice: labTests.price,
            taxCode: labTests.taxCode,
          })
          .from(requests)
          .leftJoin(labTests, eq(requests.testId, labTests.id))
          .where(and(inArray(requests.id, requestIds), eq(requests.organisationId, orgId)))
      : Promise.resolve([]),
    prescriptionIds.length > 0
      ? executor
          .select({
            id: prescriptions.id,
            patientId: prescriptions.patientId,
            catalogId: prescriptions.productId,
            name: products.name,
            basePrice: products.price,
            taxCode: products.taxCode,
          })
          .from(prescriptions)
          .leftJoin(products, eq(prescriptions.productId, products.id))
          .where(and(inArray(prescriptions.id, prescriptionIds), eq(prescriptions.organisationId, orgId)))
      : Promise.resolve([]),
    chargeIds.length > 0
      ? executor
          .select({
            id: patientCharges.id,
            patientId: patientCharges.patientId,
            sourceType: patientCharges.sourceType,
            serviceItemId: patientCharges.serviceItemId,
            wardId: patientCharges.wardId,
            name: patientCharges.description,
            unitPrice: patientCharges.unitPrice,
            quantity: patientCharges.quantity,
            taxCode: patientCharges.taxCode,
            vaccineId: vaccinationCourses.vaccineId,
          })
          .from(patientCharges)
          // Vaccine doses are tariffed per vaccine (price list item type "vaccine").
          .leftJoin(vaccinationDoses, eq(vaccinationDoses.chargeId, patientCharges.id))
          .leftJoin(vaccinationCourses, eq(vaccinationDoses.courseId, vaccinationCourses.id))
          .where(and(inArray(patientCharges.id, chargeIds), eq(patientCharges.organisationId, orgId), isNull(patientCharges.deletedAt)))
      : Promise.resolve([]),
  ]);

  // Every bill line in one shape: which catalog it's priced from, and how many.
  type Row = { id: number; patientId: number; catalogType: string; catalogId: number | null; name: string | null; basePrice: number | null; taxCode: string | null; quantity: number };
  const reqRows: Row[] = requestRows.map((r) => ({ ...r, catalogType: "lab_test", quantity: 1 }));
  const rxRows: Row[] = prescriptionRows.map((r) => ({ ...r, catalogType: "product", quantity: 1 }));
  const chRows: Row[] = chargeRows.map((c) => ({
    id: c.id,
    patientId: c.patientId,
    catalogType: c.sourceType === "bed_day" ? "ward_bed" : c.sourceType === "vaccine" ? "vaccine" : "service",
    catalogId: c.sourceType === "bed_day" ? c.wardId : c.sourceType === "vaccine" ? c.vaccineId : c.serviceItemId,
    name: c.name,
    basePrice: c.unitPrice * c.quantity,
    taxCode: c.taxCode,
    quantity: c.quantity,
  }));

  // Who pays is decided by the patient's active coverage valid today — not
  // the patients.hmoId mirror — so an expired or suspended enrolment bills
  // self-pay. Price-list effective dates are Nigerian calendar dates.
  const today = todayInLagos();
  const patientIds = [...new Set([...reqRows, ...rxRows, ...chRows].map((r) => r.patientId))];
  const coverageByPatient = await getActiveCoverages(executor, orgId, patientIds, today);

  // Then, in parallel (one round trip):
  //  - the active price list per HMO (active, not deleted, in effect today;
  //    if several overlap, the one that started most recently wins) with the
  //    tariff lines for these items — a list with no matching line still
  //    comes back (item columns null) so "not listed" can be told apart;
  //  - pre-authorization decisions: an HMO that declined won't pay, so those
  //    items bill self-pay until re-authorized. Only the newest non-cancelled
  //    authorization per item counts (a later approval overrides a denial).
  //    Queried here directly (not via lib/billing/authorizations, which
  //    depends on this module).
  const hmoIds = [...new Set([...coverageByPatient.values()].map((c) => c.hmoId))];
  const ids = (rows: Row[], type: string) =>
    [...new Set(rows.filter((r) => r.catalogType === type).map((r) => r.catalogId).filter((v): v is number => v != null))];
  const catalogConditions = [
    ["lab_test", ids(reqRows, "lab_test")],
    ["product", ids(rxRows, "product")],
    ["service", ids(chRows, "service")],
    ["ward_bed", ids(chRows, "ward_bed")],
    ["vaccine", ids(chRows, "vaccine")],
  ]
    .filter(([, list]) => (list as number[]).length > 0)
    .map(([type, list]) => and(eq(priceListItems.itemType, type as string), inArray(priceListItems.itemId, list as number[])));

  const authConds = [];
  if (requestIds.length > 0) authConds.push(and(eq(hmoAuthorizationItems.itemType, "request"), inArray(hmoAuthorizationItems.itemId, requestIds)));
  if (prescriptionIds.length > 0) authConds.push(and(eq(hmoAuthorizationItems.itemType, "prescription"), inArray(hmoAuthorizationItems.itemId, prescriptionIds)));
  if (chargeIds.length > 0) authConds.push(and(eq(hmoAuthorizationItems.itemType, "charge"), inArray(hmoAuthorizationItems.itemId, chargeIds)));

  const [listRows, authRows] = await Promise.all([
    hmoIds.length > 0
      ? executor
          .select({ listId: priceLists.id, hmoId: priceLists.hmoId, tariff: priceListItems })
          .from(priceLists)
          .leftJoin(
            priceListItems,
            and(eq(priceListItems.priceListId, priceLists.id), catalogConditions.length > 0 ? or(...catalogConditions) : sql`false`),
          )
          .where(and(
            eq(priceLists.organisationId, orgId),
            inArray(priceLists.hmoId, hmoIds),
            eq(priceLists.isActive, true),
            isNull(priceLists.deletedAt),
            lte(priceLists.effectiveFrom, today),
            or(isNull(priceLists.effectiveTo), gte(priceLists.effectiveTo, today)),
          ))
          .orderBy(desc(priceLists.effectiveFrom), desc(priceLists.id))
      : Promise.resolve([]),
    coverageByPatient.size > 0 && authConds.length > 0
      ? executor
          .select({ itemType: hmoAuthorizationItems.itemType, itemId: hmoAuthorizationItems.itemId, status: hmoAuthorizations.status })
          .from(hmoAuthorizationItems)
          .innerJoin(hmoAuthorizations, eq(hmoAuthorizationItems.authorizationId, hmoAuthorizations.id))
          .where(and(eq(hmoAuthorizations.organisationId, orgId), ne(hmoAuthorizations.status, "cancelled"), or(...authConds)))
          .orderBy(desc(hmoAuthorizations.requestedAt), desc(hmoAuthorizations.id))
      : Promise.resolve([]),
  ]);

  const listByHmo = new Map<number, number>();
  const tariffByKey = new Map<string, typeof priceListItems.$inferSelect>();
  for (const l of listRows) {
    if (!listByHmo.has(l.hmoId)) listByHmo.set(l.hmoId, l.listId);
    if (listByHmo.get(l.hmoId) !== l.listId || !l.tariff) continue;
    tariffByKey.set(`${l.listId}:${l.tariff.itemType}:${l.tariff.itemId}`, l.tariff);
  }

  const declined = new Set<string>();
  const seen = new Set<string>();
  for (const a of authRows) {
    const k = `${a.itemType}:${a.itemId}`;
    if (seen.has(k)) continue;
    seen.add(k);
    if (a.status === "denied") declined.add(k);
  }

  const price = (
    itemType: BillItemType,
    row: Row,
  ): PricedItem => {
    const item = priceItem(itemType, row);
    return { ...item, vatAmount: vatInclusiveAmount(item.price, item.taxCode) };
  };

  const priceItem = (
    itemType: BillItemType,
    row: Row,
  ): PricedItem => {
    const coverage = coverageByPatient.get(row.patientId);
    const listId = coverage ? listByHmo.get(coverage.hmoId) ?? null : null;
    const tariff = listId != null && row.catalogId != null
      ? tariffByKey.get(`${listId}:${row.catalogType}:${row.catalogId}`)
      : undefined;

    const base: PricedItem = {
      itemType,
      itemId: row.id,
      patientId: row.patientId,
      description: row.name,
      basePrice: row.basePrice,
      price: row.basePrice,
      tariffPrice: null,
      taxCode: row.taxCode ?? "zero_rated",
      vatAmount: 0,
      hmoAmount: 0,
      patientAmount: row.basePrice ?? 0,
      basis: "self_pay",
      hmoId: coverage?.hmoId ?? null,
      hmoName: coverage?.hmoName ?? null,
      priceListId: listId,
      coverageId: coverage?.coverageId ?? null,
      policyNumber: coverage?.membershipNumber ?? null,
      copayPercent: 0,
      requiresAuthorization: false,
      eligibilityStale: coverage?.eligibilityStale ?? false,
      lastEligibility: coverage?.lastEligibility ?? null,
    };

    if (listId == null) return base;
    if (!tariff) return { ...base, basis: "not_listed" as const };
    if (tariff.coverage === "excluded") return { ...base, basis: "excluded" as const };
    if (declined.has(itemKey(itemType, row.id))) {
      return {
        ...base,
        basis: "auth_declined" as const,
        tariffPrice: tariff.price * row.quantity,
        requiresAuthorization: tariff.requiresAuthorization,
      };
    }

    // Tariffs are per unit (per test, per day, per service); bill lines can
    // carry a quantity (e.g. 3 × dressing).
    const tariffTotal = tariff.price * row.quantity;
    const copay = Math.min(100, Math.max(0, tariff.copayPercent));
    const patientAmount = Math.round((tariffTotal * copay) / 100);
    return {
      ...base,
      price: tariffTotal,
      tariffPrice: tariffTotal,
      hmoAmount: tariffTotal - patientAmount,
      patientAmount,
      basis: "covered" as const,
      copayPercent: copay,
      requiresAuthorization: tariff.requiresAuthorization,
    };
  };

  for (const row of reqRows) result.set(itemKey("request", row.id), price("request", row));
  for (const row of rxRows) result.set(itemKey("prescription", row.id), price("prescription", row));
  for (const row of chRows) result.set(itemKey("charge", row.id), price("charge", row));
  return result;
}

/**
 * Records the HMO's share of items that have just been settled as
 * hmo_charges rows (the receivables HMO claims are built from). Prefer
 * settleHmoItems (lib/billing/settle.ts), which also links each charge to
 * its approved authorization. Items with no HMO share are skipped;
 * re-recording the same item is a no-op (unique index on itemType+itemId).
 */
export async function recordHmoCharges(
  executor: Executor,
  orgId: number,
  priced: PricedItem[],
  options: {
    authorizationCode?: string | null;
    /** Approved authorization per item (itemKey → {id, code}). */
    authorizations?: Map<string, { id: number; code: string | null }>;
  } = {},
): Promise<void> {
  const rows = priced
    .filter((p) => p.basis === "covered" && p.hmoAmount > 0 && p.hmoId != null && p.priceListId != null)
    .map((p) => {
      const auth = options.authorizations?.get(itemKey(p.itemType, p.itemId));
      return {
        organisationId: orgId,
        patientId: p.patientId,
        hmoId: p.hmoId as number,
        priceListId: p.priceListId as number,
        coverageId: p.coverageId,
        itemType: p.itemType,
        itemId: p.itemId,
        description: p.description,
        policyNumber: p.policyNumber,
        tariffPrice: p.price ?? 0,
        hmoAmount: p.hmoAmount,
        patientAmount: p.patientAmount,
        requiresAuthorization: p.requiresAuthorization,
        authorizationId: auth?.id ?? null,
        authorizationCode: auth?.code ?? (options.authorizationCode?.trim() || null),
      };
    });
  if (rows.length === 0) return;
  await executor.insert(hmoCharges).values(rows).onConflictDoNothing();
}

/** The client-facing slice of a PricedItem for finance/portal tables. */
export function billingSummary(p: PricedItem | undefined) {
  if (!p) return null;
  return {
    basis: p.basis,
    price: p.price,
    tariffPrice: p.tariffPrice,
    taxCode: p.taxCode,
    vatAmount: p.vatAmount,
    hmoAmount: p.hmoAmount,
    patientAmount: p.patientAmount,
    hmoName: p.hmoName,
    copayPercent: p.copayPercent,
    requiresAuthorization: p.requiresAuthorization,
    coverageId: p.coverageId,
    eligibilityStale: p.basis !== "self_pay" && p.eligibilityStale,
    lastEligibility: p.lastEligibility,
  };
}

export type BillingSummary = NonNullable<ReturnType<typeof billingSummary>>;
