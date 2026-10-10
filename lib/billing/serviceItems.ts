import { isTaxCode, DEFAULT_TAX_CODE } from "@/lib/billing/tax";

export const SERVICE_CATEGORIES = {
  consultation: "Consultation",
  procedure: "Procedure",
  nursing: "Nursing care",
  theatre: "Theatre / surgery",
  registration: "Registration / card",
  accommodation: "Accommodation / feeding",
  other: "Other",
} as const;

export function validateServiceItem(input: Record<string, unknown>) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name) return { error: "Service name is required" } as const;
  const category = (input.category ?? "other") as string;
  if (!(category in SERVICE_CATEGORIES)) return { error: "Invalid category" } as const;
  const price = Number(input.price);
  if (!Number.isInteger(price) || price < 0) return { error: "Price must be a whole Naira amount" } as const;
  const taxCode = input.taxCode ?? DEFAULT_TAX_CODE;
  if (!isTaxCode(taxCode)) return { error: "Invalid tax code" } as const;
  return { value: { name, category, price, taxCode, isActive: input.isActive !== false } } as const;
}
