import { db } from "@/lib/db";
import { patients, patientAllergies, drugGenerics, drugClasses } from "@/lib/db/schema";
import { and, eq, inArray, isNull, ne, or } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export type AlertRule = "drug_allergy" | "class_allergy" | "cross_reactivity" | "allergy_not_assessed";
export type AlertSeverity = "critical" | "warning";

export interface CdsAlert {
  /** Stable id for this alert within one check: the prescriber's override
   * must reference it. */
  key: string;
  rule: AlertRule;
  severity: AlertSeverity;
  genericId: number | null;
  allergyId: number | null;
  title: string;
  message: string;
}

/** Coded reasons a prescriber can give for proceeding past an alert. */
export const OVERRIDE_REASONS = [
  { key: "tolerated_before", label: "Patient has taken this drug before without a reaction" },
  { key: "history_doubtful", label: "Allergy history is doubtful / was a side effect, not an allergy" },
  { key: "benefit_outweighs_risk", label: "Benefit outweighs the risk — will monitor closely" },
  { key: "no_alternative", label: "No suitable alternative available" },
  { key: "desensitisation", label: "Under a desensitisation / test-dose protocol" },
  { key: "allergies_checked_none", label: "Asked the patient — no known allergies (record it on their file)" },
  { key: "other", label: "Other (explain)" },
] as const;
export type OverrideReasonKey = (typeof OVERRIDE_REASONS)[number]["key"];
export const OVERRIDE_REASON_KEYS = OVERRIDE_REASONS.map((r) => r.key) as string[];

const SEVERITY_LABEL: Record<string, string> = {
  mild: "mild",
  moderate: "moderate",
  severe: "severe",
  life_threatening: "life-threatening",
};

/** Whole-word, case-insensitive containment ("amoxicillin" in "Amoxicillin + Clavulanic acid"). */
function nameContains(haystack: string, needle: string): boolean {
  const h = ` ${haystack.toLowerCase().replace(/[^a-z0-9-]+/g, " ")} `;
  const n = needle.toLowerCase().replace(/[^a-z0-9-]+/g, " ").trim();
  return n.length > 0 && h.includes(` ${n} `);
}

/**
 * Allergy checks for drugs about to be prescribed (by active ingredient):
 *  - drug_allergy (critical): patient is allergic to this ingredient
 *  - class_allergy (critical): patient is allergic to a class containing it
 *    (both drop to "warning" when the record is an intolerance — a side
 *    effect, not an immune reaction)
 *  - cross_reactivity (warning): patient is allergic to a class (or a drug in
 *    a class) that commonly cross-reacts with this drug's class
 *  - allergy_not_assessed (warning): nobody has recorded the patient's
 *    allergy status yet
 * Refuted and entered-in-error allergies are ignored. Every alert must be
 * acknowledged with a reason to proceed (see OVERRIDE_REASONS).
 */
export async function checkPrescriptionAllergies(
  executor: Executor,
  orgId: number,
  patientId: number,
  genericIds: number[],
): Promise<CdsAlert[]> {
  const ids = [...new Set(genericIds.filter((g) => Number.isInteger(g)))];
  if (ids.length === 0) return [];

  const [patient] = await executor
    .select({ allergyStatus: patients.allergyStatus })
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.organisationId, orgId)))
    .limit(1);
  if (!patient) return [];

  const [generics, allergies, classes] = await Promise.all([
    executor
      .select({ id: drugGenerics.id, name: drugGenerics.name, strength: drugGenerics.strength })
      .from(drugGenerics)
      .where(and(inArray(drugGenerics.id, ids), eq(drugGenerics.organisationId, orgId))),
    executor
      .select()
      .from(patientAllergies)
      .where(and(
        eq(patientAllergies.patientId, patientId),
        eq(patientAllergies.organisationId, orgId),
        isNull(patientAllergies.deletedAt),
        ne(patientAllergies.verification, "refuted"),
        inArray(patientAllergies.category, ["drug", "drug_class"]),
      )),
    executor
      .select()
      .from(drugClasses)
      .where(and(isNull(drugClasses.deletedAt), or(isNull(drugClasses.organisationId), eq(drugClasses.organisationId, orgId)))),
  ]);

  const alerts: CdsAlert[] = [];

  if (patient.allergyStatus === "not_assessed") {
    alerts.push({
      key: "allergy_not_assessed",
      rule: "allergy_not_assessed",
      severity: "warning",
      genericId: null,
      allergyId: null,
      title: "Allergies not recorded",
      message: "This patient's allergies have never been recorded. Ask about allergies before prescribing, and record the answer on their file.",
    });
  }
  if (allergies.length === 0) return alerts;

  const classById = new Map(classes.map((c) => [c.id, c]));
  const classesOf = (ingredient: string) => classes.filter((c) => c.members.some((m) => nameContains(ingredient, m)));

  // Allergies recorded against a generic of this org: resolve their names.
  const allergyGenericIds = allergies.map((a) => a.genericId).filter((v): v is number => v != null);
  const allergyGenerics = allergyGenericIds.length
    ? await executor.select({ id: drugGenerics.id, name: drugGenerics.name }).from(drugGenerics).where(inArray(drugGenerics.id, allergyGenericIds))
    : [];
  const allergyGenericName = new Map(allergyGenerics.map((g) => [g.id, g.name]));

  for (const g of generics) {
    const drugLabel = `${g.name} ${g.strength}`.trim();
    const drugClassesForG = classesOf(g.name);
    const seen = new Set<number>();

    for (const a of allergies) {
      const severity = SEVERITY_LABEL[a.severity] ?? a.severity;
      const what = a.type === "intolerance" ? "intolerance" : "allergy";
      const reaction = a.reaction ? ` (reaction: ${a.reaction})` : "";
      const confirmed = a.verification === "confirmed" ? "confirmed" : "reported";

      if (a.category === "drug") {
        const allergenName = (a.genericId != null ? allergyGenericName.get(a.genericId) : null) ?? a.substance;
        const direct = a.genericId === g.id || nameContains(g.name, allergenName) || nameContains(allergenName, g.name);
        if (direct) {
          seen.add(a.id);
          alerts.push({
            key: `drug_allergy:${g.id}:${a.id}`,
            rule: "drug_allergy",
            severity: a.type === "intolerance" ? "warning" : "critical",
            genericId: g.id,
            allergyId: a.id,
            title: `${a.type === "intolerance" ? "Intolerance" : "Allergy"} to ${a.substance}`,
            message: `Patient has a ${confirmed} ${severity} ${what} to ${a.substance}${reaction}. You are prescribing ${drugLabel}.`,
          });
          continue;
        }
        // Allergic to a drug in a class that this drug shares → class-level risk.
        const allergenClasses = classesOf(allergenName);
        const shared = allergenClasses.find((c) => drugClassesForG.some((d) => d.id === c.id));
        if (shared && !seen.has(a.id)) {
          seen.add(a.id);
          alerts.push({
            key: `class_allergy:${g.id}:${a.id}`,
            rule: "class_allergy",
            severity: a.type === "intolerance" ? "warning" : "critical",
            genericId: g.id,
            allergyId: a.id,
            title: `Same drug family as ${a.substance}`,
            message: `${drugLabel} and ${a.substance} are both ${shared.name}. Patient has a ${confirmed} ${severity} ${what} to ${a.substance}${reaction}.`,
          });
          continue;
        }
        const cross = allergenClasses.find((c) => (c.crossReactsWith ?? []).some((k) => drugClassesForG.some((d) => d.key === k)));
        if (cross && !seen.has(a.id)) {
          seen.add(a.id);
          const target = drugClassesForG.find((d) => (cross.crossReactsWith ?? []).includes(d.key));
          alerts.push({
            key: `cross_reactivity:${g.id}:${a.id}`,
            rule: "cross_reactivity",
            severity: "warning",
            genericId: g.id,
            allergyId: a.id,
            title: `Possible cross-reaction with ${a.substance}`,
            message: `Patient has a ${confirmed} ${severity} ${what} to ${a.substance} (${cross.name}). ${drugLabel} is a ${target?.name ?? "related drug"}, which can cross-react.`,
          });
        }
      } else if (a.category === "drug_class" && a.drugClassId != null) {
        const cls = classById.get(a.drugClassId);
        if (!cls) continue;
        if (drugClassesForG.some((d) => d.id === cls.id)) {
          alerts.push({
            key: `class_allergy:${g.id}:${a.id}`,
            rule: "class_allergy",
            severity: a.type === "intolerance" ? "warning" : "critical",
            genericId: g.id,
            allergyId: a.id,
            title: `${a.type === "intolerance" ? "Intolerance" : "Allergy"} to ${cls.name}`,
            message: `Patient has a ${confirmed} ${severity} ${what} to ${cls.name}${reaction}. ${drugLabel} belongs to this family.`,
          });
        } else if ((cls.crossReactsWith ?? []).some((k) => drugClassesForG.some((d) => d.key === k))) {
          const target = drugClassesForG.find((d) => (cls.crossReactsWith ?? []).includes(d.key));
          alerts.push({
            key: `cross_reactivity:${g.id}:${a.id}`,
            rule: "cross_reactivity",
            severity: "warning",
            genericId: g.id,
            allergyId: a.id,
            title: `Possible cross-reaction with ${cls.name}`,
            message: `Patient has a ${confirmed} ${severity} ${what} to ${cls.name}. ${drugLabel} is a ${target?.name ?? "related drug"}, which can cross-react.`,
          });
        }
      }
    }
  }
  return alerts;
}

export interface AlertOverride {
  key: string;
  reason: string;
  note?: string | null;
}

/** Returns the alerts that still lack a valid override, or [] if all are covered. */
export function unacknowledgedAlerts(alerts: CdsAlert[], overrides: AlertOverride[] | undefined): CdsAlert[] {
  const byKey = new Map((overrides ?? []).map((o) => [o.key, o]));
  return alerts.filter((a) => {
    const o = byKey.get(a.key);
    if (!o || !OVERRIDE_REASON_KEYS.includes(o.reason)) return true;
    return o.reason === "other" && !(o.note ?? "").trim();
  });
}
