/**
 * VAT treatment per catalog item. Under the Nigeria Tax Act 2025 (in force
 * 1 Jan 2026) medical services, pharmaceuticals and medical equipment are
 * ZERO-RATED (0%, but still VAT-able supplies — distinct from exempt), so
 * that is the default. Non-medical items (e.g. toiletries, cafeteria,
 * cosmetic products) are standard-rated at 7.5%.
 *
 * Catalog prices are VAT-inclusive (the amount the patient pays), so the VAT
 * content is carved out of the price rather than added on top.
 */
export const TAX_CODES = {
  zero_rated: { label: "Zero-rated (0%) — medical", rate: 0 },
  standard: { label: "Standard VAT (7.5%)", rate: 7.5 },
  exempt: { label: "Exempt", rate: 0 },
} as const;

export type TaxCode = keyof typeof TAX_CODES;
export const TAX_CODE_KEYS = Object.keys(TAX_CODES) as TaxCode[];
export const DEFAULT_TAX_CODE: TaxCode = "zero_rated";

export function isTaxCode(v: unknown): v is TaxCode {
  return typeof v === "string" && (TAX_CODE_KEYS as string[]).includes(v);
}

/** VAT contained in a VAT-inclusive whole-Naira price. */
export function vatInclusiveAmount(price: number | null | undefined, code: string | null | undefined): number {
  if (!price || !isTaxCode(code)) return 0;
  const rate = TAX_CODES[code].rate;
  return rate > 0 ? Math.round((price * rate) / (100 + rate)) : 0;
}
