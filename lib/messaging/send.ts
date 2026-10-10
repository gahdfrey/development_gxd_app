import { db } from "@/lib/db";
import { organisations, patients, messageTemplates, outboundMessages } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getMessagingGateway } from "@/lib/messaging";
import { MESSAGE_KINDS, renderTemplate, type AutoMessageKind } from "@/lib/messaging/templates";
import { toMsisdn } from "@/lib/messaging/phone";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

export interface SendToPatientInput {
  orgId: number;
  patientId: number;
  kind: AutoMessageKind | "custom";
  vars?: Record<string, string | number | null | undefined>;
  /** Free text for kind "custom". */
  body?: string;
  dedupeKey?: string;
  relatedType?: "appointment" | "request" | "payment";
  relatedId?: number;
  sentBy?: number | null;
}

export type SendOutcome =
  | { status: "sent" | "failed" | "skipped"; messageId: number; reason?: string }
  | { status: "not_sent"; reason: string };

/**
 * Sends one SMS to a patient and logs it. Never throws — a messaging
 * problem must not break the clinical or billing action that triggered it.
 *  - Nothing is sent (or logged) when the hospital has SMS switched off or
 *    that automatic message turned off.
 *  - Opted-out patients and invalid numbers are logged as "skipped".
 *  - dedupeKey makes an automatic message go at most once (the log row is
 *    claimed before sending, so two concurrent runs can't both send).
 */
export async function sendToPatient(input: SendToPatientInput, executor: Executor = db): Promise<SendOutcome> {
  try {
    const [org] = await executor
      .select({ name: organisations.name, enabled: organisations.smsEnabled, senderId: organisations.smsSenderId, settings: organisations.smsSettings })
      .from(organisations)
      .where(eq(organisations.id, input.orgId))
      .limit(1);
    if (!org) return { status: "not_sent", reason: "Organisation not found" };
    if (!org.enabled) return { status: "not_sent", reason: "SMS is switched off for this hospital" };
    if (input.kind !== "custom" && org.settings?.[input.kind] === false) {
      return { status: "not_sent", reason: "This automatic message is switched off" };
    }

    const [patient] = await executor
      .select({ firstname: patients.firstname, phone: patients.phone, countryCode: patients.countryCode, optOut: patients.messagingOptOut, deletedAt: patients.deletedAt })
      .from(patients)
      .where(and(eq(patients.id, input.patientId), eq(patients.organisationId, input.orgId)))
      .limit(1);
    if (!patient || patient.deletedAt) return { status: "not_sent", reason: "Patient not found" };

    let body: string;
    if (input.kind === "custom") {
      body = (input.body ?? "").trim();
      if (!body) return { status: "not_sent", reason: "Empty message" };
    } else {
      const [tpl] = await executor
        .select({ body: messageTemplates.body })
        .from(messageTemplates)
        .where(and(eq(messageTemplates.organisationId, input.orgId), eq(messageTemplates.kind, input.kind)))
        .limit(1);
      body = renderTemplate(tpl?.body ?? MESSAGE_KINDS[input.kind].body, { patient: patient.firstname, hospital: org.name, ...input.vars });
    }

    const to = toMsisdn(patient.countryCode, patient.phone);
    const skipReason = patient.optOut ? "Patient opted out of SMS" : !to ? "No valid mobile number" : null;
    const gateway = getMessagingGateway();

    // Claim the dedupe slot (and create the log row) before sending.
    const [row] = await executor
      .insert(outboundMessages)
      .values({
        organisationId: input.orgId,
        patientId: input.patientId,
        kind: input.kind,
        toPhone: to,
        body,
        status: skipReason ? "skipped" : "sending",
        skipReason,
        provider: skipReason ? null : gateway.provider,
        dedupeKey: input.dedupeKey ?? null,
        relatedType: input.relatedType ?? null,
        relatedId: input.relatedId ?? null,
        sentBy: input.sentBy ?? null,
      })
      .onConflictDoNothing()
      .returning({ id: outboundMessages.id });
    if (!row) return { status: "not_sent", reason: "Already sent" };
    if (skipReason) return { status: "skipped", messageId: row.id, reason: skipReason };

    const result = await gateway.send({ to: to as string, body, senderId: org.senderId });
    await executor
      .update(outboundMessages)
      .set({ status: result.ok ? "sent" : "failed", providerRef: result.providerRef, error: result.error ?? null })
      .where(eq(outboundMessages.id, row.id));
    return { status: result.ok ? "sent" : "failed", messageId: row.id, reason: result.error };
  } catch (err) {
    console.error("sendToPatient failed:", err);
    return { status: "not_sent", reason: "Messaging error" };
  }
}

/** Formats a WAT date "YYYY-MM-DD" as e.g. "Mon 6 Oct". */
export function friendlyDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** "14:30" → "2:30pm". */
export function friendlyTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}
