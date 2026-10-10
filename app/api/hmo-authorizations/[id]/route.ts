import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hmoAuthorizations, hmoAuthorizationItems, hmoCharges } from "@/lib/db/schema";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { AUTH_CHANNELS } from "@/lib/billing/authorizations";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

/**
 * PATCH /api/hmo-authorizations/[id] — move an authorization through its
 * lifecycle. Body: { action, ... }
 *   send      { channel }                 pending, unsent → sent (SLA clock starts)
 *   approve   { code, validUntil? }       pending → approved
 *   deny      { denialReason }            pending → denied
 *   escalate  { escalationNote }          pending & sent → escalated (stays pending)
 *   cancel    { notes? }                  pending → cancelled
 *   update    { code?, validUntil? }      approved → correct the code / validity
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authz = await requirePermission([["finance", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const id = parseInt((await params).id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid authorization ID" }, { status: 400 });

    const [auth] = await db
      .select()
      .from(hmoAuthorizations)
      .where(and(eq(hmoAuthorizations.id, id), eq(hmoAuthorizations.organisationId, orgId)))
      .limit(1);
    if (!auth) return NextResponse.json({ error: "Authorization not found" }, { status: 404 });

    const body = await request.json();
    const action = body.action as string;
    const now = new Date();
    let set: Partial<typeof hmoAuthorizations.$inferInsert>;

    const requirePending = () =>
      auth.status !== "pending"
        ? NextResponse.json({ error: `This authorization is already ${auth.status}` }, { status: 409 })
        : null;

    switch (action) {
      case "send": {
        const err = requirePending();
        if (err) return err;
        if (auth.sentAt) return NextResponse.json({ error: "Already sent to the HMO" }, { status: 409 });
        if (!(AUTH_CHANNELS as readonly string[]).includes(body.channel)) {
          return NextResponse.json({ error: "Select how the request was sent" }, { status: 400 });
        }
        set = { sentAt: now, sentBy: userId, channel: body.channel };
        break;
      }
      case "approve": {
        const err = requirePending();
        if (err) return err;
        const code = text(body.code);
        if (!code) return NextResponse.json({ error: "Enter the authorization code the HMO gave" }, { status: 400 });
        const validUntil = text(body.validUntil);
        if (validUntil && !DATE_RE.test(validUntil)) return NextResponse.json({ error: "Invalid valid-until date" }, { status: 400 });
        set = { status: "approved", code, validUntil, respondedAt: now, respondedBy: userId };
        break;
      }
      case "deny": {
        const err = requirePending();
        if (err) return err;
        const denialReason = text(body.denialReason);
        if (!denialReason) return NextResponse.json({ error: "Give the HMO's reason for declining" }, { status: 400 });
        set = { status: "denied", denialReason, respondedAt: now, respondedBy: userId };
        break;
      }
      case "escalate": {
        const err = requirePending();
        if (err) return err;
        if (!auth.sentAt) return NextResponse.json({ error: "Send the request to the HMO before escalating" }, { status: 400 });
        const escalationNote = text(body.escalationNote);
        if (!escalationNote) return NextResponse.json({ error: "Note who it was escalated to" }, { status: 400 });
        set = { escalatedAt: now, escalatedBy: userId, escalationNote };
        break;
      }
      case "cancel": {
        const err = requirePending();
        if (err) return err;
        set = { status: "cancelled", notes: text(body.notes) ?? auth.notes };
        break;
      }
      case "update": {
        if (auth.status !== "approved") return NextResponse.json({ error: "Only approved authorizations can be corrected" }, { status: 409 });
        const code = text(body.code) ?? auth.code;
        const validUntil = body.validUntil !== undefined ? text(body.validUntil) : auth.validUntil;
        if (validUntil && !DATE_RE.test(validUntil)) return NextResponse.json({ error: "Invalid valid-until date" }, { status: 400 });
        set = { code, validUntil };
        break;
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(hmoAuthorizations)
        .set({ ...set, updatedAt: now })
        .where(eq(hmoAuthorizations.id, id))
        .returning();

      // Items already settled before the code arrived ("treat now, attach
      // later"): link their HMO charges to this authorization.
      if (row.status === "approved") {
        const items = await tx.select().from(hmoAuthorizationItems).where(eq(hmoAuthorizationItems.authorizationId, id));
        const byType = (t: string) => items.filter((i) => i.itemType === t).map((i) => i.itemId);
        const conds = [];
        if (byType("request").length) conds.push(and(eq(hmoCharges.itemType, "request"), inArray(hmoCharges.itemId, byType("request"))));
        if (byType("prescription").length) conds.push(and(eq(hmoCharges.itemType, "prescription"), inArray(hmoCharges.itemId, byType("prescription"))));
        if (conds.length > 0) {
          await tx
            .update(hmoCharges)
            .set({ authorizationId: id, authorizationCode: row.code, updatedAt: now })
            .where(and(
              eq(hmoCharges.organisationId, orgId),
              or(...conds),
              action === "update" ? eq(hmoCharges.authorizationId, id) : isNull(hmoCharges.authorizationId),
            ));
        }
      }
      return row;
    });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: `hmo_authorization.${action}`,
      entityType: "hmo_authorization",
      entityId: id,
      details: { before: auth.status, after: updated.status, ...set },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating HMO authorization:", error);
    return NextResponse.json({ error: "Failed to update authorization" }, { status: 500 });
  }
}
