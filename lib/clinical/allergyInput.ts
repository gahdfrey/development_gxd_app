import { db } from "@/lib/db";
import { drugGenerics, drugClasses } from "@/lib/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";
import {
  ALLERGY_CATEGORIES,
  ALLERGY_SEVERITIES,
  ALLERGY_TYPES,
  ALLERGY_VERIFICATIONS,
  LOOSE_DATE_RE,
} from "@/lib/clinical/summary";

const text = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

/**
 * Validates an allergy payload and resolves the allergen: a drug allergy
 * names an active ingredient from this org's generics (or free text when the
 * drug isn't stocked); a class allergy names a built-in or org drug class.
 */
export async function validateAllergy(orgId: number, input: Record<string, unknown>) {
  const category = input.category as (typeof ALLERGY_CATEGORIES)[number];
  if (!ALLERGY_CATEGORIES.includes(category)) return { error: "Choose what the patient is allergic to" } as const;

  const type = (input.type ?? "allergy") as (typeof ALLERGY_TYPES)[number];
  if (!ALLERGY_TYPES.includes(type)) return { error: "Invalid type" } as const;
  const severity = (input.severity ?? "moderate") as (typeof ALLERGY_SEVERITIES)[number];
  if (!ALLERGY_SEVERITIES.includes(severity)) return { error: "Invalid severity" } as const;
  const verification = (input.verification ?? "unconfirmed") as (typeof ALLERGY_VERIFICATIONS)[number];
  if (!ALLERGY_VERIFICATIONS.includes(verification)) return { error: "Invalid verification status" } as const;
  const onsetDate = text(input.onsetDate);
  if (onsetDate && !LOOSE_DATE_RE.test(onsetDate)) return { error: "Onset date should be a year or a date" } as const;

  let genericId: number | null = null;
  let drugClassId: number | null = null;
  let substance = text(input.substance);

  if (category === "drug") {
    if (input.genericId != null && input.genericId !== "") {
      genericId = Number(input.genericId);
      const [g] = await db
        .select({ name: drugGenerics.name })
        .from(drugGenerics)
        .where(and(eq(drugGenerics.id, genericId), eq(drugGenerics.organisationId, orgId)))
        .limit(1);
      if (!g) return { error: "Drug not found" } as const;
      substance = g.name;
    }
    if (!substance) return { error: "Name the drug" } as const;
  } else if (category === "drug_class") {
    drugClassId = Number(input.drugClassId);
    const [c] = Number.isInteger(drugClassId)
      ? await db
          .select({ name: drugClasses.name })
          .from(drugClasses)
          .where(and(
            eq(drugClasses.id, drugClassId),
            isNull(drugClasses.deletedAt),
            or(isNull(drugClasses.organisationId), eq(drugClasses.organisationId, orgId)),
          ))
          .limit(1)
      : [];
    if (!c) return { error: "Choose the drug family" } as const;
    substance = c.name;
  } else if (!substance) {
    return { error: "Name what the patient reacts to" } as const;
  }

  return {
    value: {
      category,
      genericId,
      drugClassId,
      substance: substance as string,
      type,
      reaction: text(input.reaction),
      severity,
      verification,
      onsetDate,
      notes: text(input.notes),
    },
  } as const;
}
