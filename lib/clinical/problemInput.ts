import { db } from "@/lib/db";
import { icd11Codes, patientProblems } from "@/lib/db/schema";
import { and, eq, isNull, ne } from "drizzle-orm";
import { LOOSE_DATE_RE, PROBLEM_STATUSES } from "@/lib/clinical/summary";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

const text = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

/** Validates a problem-list entry: an ICD-11 code from the reference table
 * and/or free text, a status, and loose onset/resolution dates. */
export async function validateProblem(input: Record<string, unknown>) {
  const icdCode = text(input.icdCode);
  const clinicalText = text(input.clinicalText);
  if (!icdCode && !clinicalText) return { error: "Choose an ICD-11 condition or describe it" } as const;

  let icdTitle = text(input.icdTitle);
  if (icdCode) {
    const [known] = await db.select({ title: icd11Codes.title }).from(icd11Codes).where(eq(icd11Codes.code, icdCode)).limit(1);
    if (!known) return { error: `Unknown ICD-11 code: ${icdCode}` } as const;
    icdTitle = known.title;
  }

  const status = (input.status ?? "active") as (typeof PROBLEM_STATUSES)[number];
  if (!PROBLEM_STATUSES.includes(status)) return { error: "Invalid status" } as const;
  const onsetDate = text(input.onsetDate);
  if (onsetDate && !LOOSE_DATE_RE.test(onsetDate)) return { error: "Onset should be a year or a date" } as const;
  let resolvedDate = text(input.resolvedDate);
  if (resolvedDate && !LOOSE_DATE_RE.test(resolvedDate)) return { error: "Resolved date should be a year or a date" } as const;
  if (status === "resolved" && !resolvedDate) {
    resolvedDate = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
  }
  if (status !== "resolved") resolvedDate = null;

  return {
    value: { icdCode, icdTitle: icdCode ? icdTitle : null, clinicalText, status, onsetDate, resolvedDate, notes: text(input.notes) },
  } as const;
}

/** An active/inactive (not resolved) entry with the same ICD code already on the list. */
export async function findOpenDuplicate(executor: Executor, patientId: number, icdCode: string | null, excludeId?: number) {
  if (!icdCode) return null;
  const conds = [
    eq(patientProblems.patientId, patientId),
    eq(patientProblems.icdCode, icdCode),
    ne(patientProblems.status, "resolved"),
    isNull(patientProblems.deletedAt),
  ];
  if (excludeId) conds.push(ne(patientProblems.id, excludeId));
  const [dup] = await executor.select({ id: patientProblems.id }).from(patientProblems).where(and(...conds)).limit(1);
  return dup ?? null;
}
