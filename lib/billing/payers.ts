import { PAYER_TYPES, type PayerType } from "@/lib/billing/priceLists";

export interface PayerInput {
  name?: unknown;
  description?: unknown;
  payerType?: unknown;
  code?: unknown;
  contactPerson?: unknown;
  phone?: unknown;
  email?: unknown;
  claimSubmissionDays?: unknown;
}

const optionalText = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

/** Validates an HMO / payer master record from the Setup → HMO form. */
export function validatePayer(input: PayerInput):
  | { error: string }
  | {
      value: {
        name: string;
        description: string | null;
        payerType: PayerType;
        code: string | null;
        contactPerson: string | null;
        phone: string | null;
        email: string | null;
        claimSubmissionDays: number | null;
      };
    } {
  const name = optionalText(input.name);
  if (!name) return { error: "HMO name is required" };

  const payerType = (input.payerType ?? "hmo") as PayerType;
  if (!PAYER_TYPES.includes(payerType)) return { error: "Invalid payer type" };

  const email = optionalText(input.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Invalid email address" };

  let claimSubmissionDays: number | null = null;
  if (input.claimSubmissionDays !== undefined && input.claimSubmissionDays !== null && input.claimSubmissionDays !== "") {
    claimSubmissionDays = Number(input.claimSubmissionDays);
    if (!Number.isInteger(claimSubmissionDays) || claimSubmissionDays < 1 || claimSubmissionDays > 365) {
      return { error: "Claim submission window must be between 1 and 365 days" };
    }
  }

  return {
    value: {
      name,
      description: optionalText(input.description),
      payerType,
      code: optionalText(input.code)?.toUpperCase() ?? null,
      contactPerson: optionalText(input.contactPerson),
      phone: optionalText(input.phone),
      email,
      claimSubmissionDays,
    },
  };
}
