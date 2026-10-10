// Mirrors lib/billing/pricing.ts#billingSummary — the per-item "who pays what"
// the finance APIs attach when called with ?withBilling=1.
export interface BillingSummary {
  basis: "self_pay" | "covered" | "excluded" | "not_listed" | "auth_declined";
  price: number | null;
  /** HMO tariff when the item is on the tariff (also for auth_declined). */
  tariffPrice: number | null;
  hmoAmount: number;
  patientAmount: number;
  hmoName: string | null;
  copayPercent: number;
  requiresAuthorization: boolean;
  coverageId: number | null;
  /** No recent "eligible" check within the org's recheck window. */
  eligibilityStale: boolean;
  lastEligibility: { checkedAt: string; result: string } | null;
  /** The item's current HMO pre-authorization, if any. */
  authorization?: AuthorizationSummary | null;
}

export interface AuthorizationSummary {
  id: number;
  status: "pending" | "approved" | "denied" | "cancelled";
  code: string | null;
  validUntil: string | null;
  sentAt: string | null;
  respondedAt: string | null;
  sla: { minutes: number; breached: boolean } | null;
}

/** NHIA one-hour response rule (mirrors lib/billing/authorizations.ts). */
export const AUTH_SLA_MINUTES = 60;

export function todayInLagos(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

/** An unpaid item the finance desk is about to settle. */
export interface SettleTarget {
  itemType: "request" | "prescription" | "charge";
  itemId: number;
  label: string;
  patientId: number | null;
  patientName: string;
  basePrice: number | null;
  billing: BillingSummary | null;
}

export function naira(amount: number | null | undefined): string {
  return amount != null ? `₦${amount.toLocaleString()}` : "—";
}

export const PAYER_TYPE_LABEL: Record<string, string> = {
  hmo: "Private HMO",
  nhia: "NHIA",
  state_scheme: "State scheme",
  corporate: "Corporate",
};
