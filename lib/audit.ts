import { db } from "./db";
import { auditLogs } from "./db/schema";

export interface AuditEntry {
  organisationId?: number | null;
  userId?: number | null;
  userEmail?: string | null;
  /** e.g. "create" | "update" | "delete" | "login.success" | "login.failure" | "consent.granted" | "consent.withdrawn" */
  action: string;
  /** e.g. "patient" | "visit" | "prescription" | "user" | "role" */
  entityType: string;
  entityId?: string | number | null;
  /** Contextual payload. Never include passwords or raw credentials. */
  details?: Record<string, unknown> | null;
}

/**
 * Append an entry to the audit trail. Fire-and-forget safe: failures are
 * logged to the server console but never thrown, so audit problems can't
 * break clinical workflows.
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      organisationId: entry.organisationId ?? null,
      userId: entry.userId ?? null,
      userEmail: entry.userEmail ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId != null ? String(entry.entityId) : null,
      details: entry.details ?? null,
    });
  } catch (error) {
    console.error("[audit] failed to write audit log entry:", error);
  }
}
