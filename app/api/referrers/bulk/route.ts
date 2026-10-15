import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { referrers } from "@/lib/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { parseReferrerInput, referrerCode, type ReferrerInput } from "@/lib/referrals";

const MAX_ROWS = 1000;

/**
 * POST /api/referrers/bulk — { rows: [{ name, accountName, accountNumber,
 * bank, whatsappNumber }] } from the CSV upload. Valid rows are created in
 * one transaction; invalid rows, and rows whose account number already
 * belongs to a referrer (here or earlier in the file), are reported back by
 * row number and skipped.
 */
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["setup", "add"]]);
    if (authz.error) return authz.error;
    const { orgId, userId: actorId, userEmail: actorEmail } = authz.ctx;

    const body = await request.json();
    const rows: unknown = body?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows to import" }, { status: 400 });
    }
    if (rows.length > MAX_ROWS) {
      return NextResponse.json({ error: `Upload at most ${MAX_ROWS} referrers at a time` }, { status: 400 });
    }

    const errors: { row: number; error: string }[] = [];
    const valid: { row: number; data: ReferrerInput }[] = [];
    rows.forEach((raw, i) => {
      const parsed = parseReferrerInput((raw ?? {}) as Record<string, unknown>);
      if (!parsed.data) errors.push({ row: i + 1, error: parsed.error });
      else valid.push({ row: i + 1, data: parsed.data });
    });

    const accountNumbers = valid.map((v) => v.data.accountNumber);
    const existing = accountNumbers.length
      ? await db
          .select({ accountNumber: referrers.accountNumber })
          .from(referrers)
          .where(and(
            eq(referrers.organisationId, orgId),
            isNull(referrers.deletedAt),
            inArray(referrers.accountNumber, accountNumbers),
          ))
      : [];
    const seen = new Set(existing.map((e) => e.accountNumber));

    const toInsert: ReferrerInput[] = [];
    for (const v of valid) {
      if (seen.has(v.data.accountNumber)) {
        errors.push({ row: v.row, error: `Account number ${v.data.accountNumber} already belongs to a referrer` });
        continue;
      }
      seen.add(v.data.accountNumber);
      toInsert.push(v.data);
    }

    const created = toInsert.length
      ? await db.transaction(async (tx) => {
          const inserted = await tx
            .insert(referrers)
            .values(toInsert.map((d) => ({ organisationId: orgId, ...d })))
            .returning({ id: referrers.id });
          for (const { id } of inserted) {
            await tx.update(referrers).set({ code: referrerCode(id) }).where(eq(referrers.id, id));
          }
          return inserted.length;
        })
      : 0;

    if (created > 0) {
      void logAudit({
        organisationId: orgId,
        userId: actorId,
        userEmail: actorEmail,
        action: "bulk_create",
        entityType: "referrer",
        details: { created, skipped: errors.length },
      });
    }

    errors.sort((a, b) => a.row - b.row);
    return NextResponse.json({ created, errors }, { status: 200 });
  } catch (error) {
    console.error("Error bulk-creating referrers:", error);
    return NextResponse.json({ error: "Failed to import referrers" }, { status: 500 });
  }
}
