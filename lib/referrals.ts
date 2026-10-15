import { parsePhoneNumberFromString } from "libphonenumber-js";

export const REF_DISCOUNT_TYPES = ["amount", "percent"] as const;
export type RefDiscountType = (typeof REF_DISCOUNT_TYPES)[number];

export function isRefDiscountType(value: unknown): value is RefDiscountType {
  return typeof value === "string" && (REF_DISCOUNT_TYPES as readonly string[]).includes(value);
}

/**
 * Validate a test's referral discount from the Test form. An empty type means
 * no discount. Percentages are capped at 100.
 */
export function parseRefDiscount(type: unknown, value: unknown):
  | { data: { refDiscountType: RefDiscountType | null; refDiscountValue: number | null }; error?: never }
  | { data?: never; error: string } {
  if (type === undefined || type === null || type === "") {
    return { data: { refDiscountType: null, refDiscountValue: null } };
  }
  if (!isRefDiscountType(type)) return { error: "Referral discount must be an amount or a percentage" };
  const num = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(num) || num <= 0) return { error: "Referral discount must be greater than 0" };
  if (type === "percent" && num > 100) return { error: "Referral discount percentage cannot exceed 100" };
  return { data: { refDiscountType: type, refDiscountValue: num } };
}

/**
 * What a referrer earns on one test, in whole naira: a percentage of the
 * price, or a flat amount (never more than the price itself).
 */
export function referralDiscount(
  price: number,
  type: string | null | undefined,
  value: number | null | undefined,
): number {
  if (!value || value <= 0) return 0;
  if (type === "percent") return Math.round((price * Math.min(value, 100)) / 100);
  if (type === "amount") return Math.min(Math.round(value), price);
  return 0;
}

/** "10%" or "₦1,500" — for tables and the referrer statement. */
export function formatRefDiscount(type: string | null | undefined, value: number | null | undefined): string {
  if (!value || !type) return "—";
  return type === "percent" ? `${value}%` : `₦${value.toLocaleString()}`;
}

/** The referrer's unique ID, derived from the row id. */
export function referrerCode(id: number): string {
  return `REF-${String(id).padStart(5, "0")}`;
}

export interface ReferrerInput {
  name: string;
  accountName: string;
  accountNumber: string;
  bank: string;
  whatsappNumber: string;
}

/**
 * Validate and normalise one referrer (form or bulk-upload row). WhatsApp
 * numbers are stored in international format; local Nigerian numbers
 * ("0803…") are read as +234.
 */
export function parseReferrerInput(raw: Record<string, unknown>):
  | { data: ReferrerInput; error?: never }
  | { data?: never; error: string } {
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
  const name = str(raw.name);
  const accountName = str(raw.accountName);
  const accountNumber = str(raw.accountNumber).replace(/\s+/g, "");
  const bank = str(raw.bank);
  const whatsappRaw = str(raw.whatsappNumber);

  if (!name) return { error: "Name is required" };
  if (!accountName) return { error: "Account name is required" };
  if (!/^\d{10}$/.test(accountNumber)) return { error: "Account number must be 10 digits" };
  if (!bank) return { error: "Bank is required" };
  if (!whatsappRaw) return { error: "WhatsApp number is required" };

  const phone = parsePhoneNumberFromString(whatsappRaw, "NG");
  if (!phone || !phone.isValid()) return { error: `"${whatsappRaw}" is not a valid WhatsApp number` };

  return { data: { name, accountName, accountNumber, bank, whatsappNumber: phone.number } };
}
