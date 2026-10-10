import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organisations, messageTemplates } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { getMessagingGateway } from "@/lib/messaging";
import { AUTO_KINDS, MESSAGE_KINDS, PLACEHOLDERS } from "@/lib/messaging/templates";

// GET — the hospital's SMS settings, templates (custom or default) and which
// provider is connected.
export async function GET() {
  try {
    const authz = await requirePermission([["setup", "view"], ["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;
    const [org] = await db
      .select({ enabled: organisations.smsEnabled, senderId: organisations.smsSenderId, settings: organisations.smsSettings })
      .from(organisations)
      .where(eq(organisations.id, orgId))
      .limit(1);
    const custom = await db.select().from(messageTemplates).where(eq(messageTemplates.organisationId, orgId));
    const gateway = getMessagingGateway();
    return NextResponse.json({
      enabled: org?.enabled ?? false,
      senderId: org?.senderId ?? null,
      provider: gateway.provider,
      live: gateway.live,
      placeholders: PLACEHOLDERS,
      kinds: AUTO_KINDS.map((k) => {
        const c = custom.find((t) => t.kind === k);
        return { kind: k, label: MESSAGE_KINDS[k].label, on: org?.settings?.[k] !== false, body: c?.body ?? MESSAGE_KINDS[k].body, isCustom: !!c, defaultBody: MESSAGE_KINDS[k].body };
      }),
    });
  } catch (error) {
    console.error("Error fetching messaging settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

// PUT { enabled, senderId, kinds: [{ kind, on, body }] } — save settings.
// A body equal to the default (or empty) removes the custom template.
export async function PUT(request: NextRequest) {
  try {
    const authz = await requirePermission([["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const body = await request.json();

    const senderId = typeof body.senderId === "string" && body.senderId.trim() ? body.senderId.trim() : null;
    if (senderId && !/^[A-Za-z0-9 ]{3,11}$/.test(senderId)) {
      return NextResponse.json({ error: "Sender ID must be 3–11 letters/numbers (as approved by your SMS provider)" }, { status: 400 });
    }
    const kinds: { kind: string; on: boolean; body?: string }[] = Array.isArray(body.kinds) ? body.kinds : [];
    const settings: Record<string, boolean> = {};
    for (const k of kinds) {
      if (!(AUTO_KINDS as string[]).includes(k.kind)) return NextResponse.json({ error: `Unknown message type ${k.kind}` }, { status: 400 });
      settings[k.kind] = k.on !== false;
      if (typeof k.body === "string" && k.body.length > 480) return NextResponse.json({ error: "Messages are limited to 480 characters (3 SMS)" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      await tx
        .update(organisations)
        .set({ smsEnabled: body.enabled === true, smsSenderId: senderId, smsSettings: settings, updatedAt: new Date() })
        .where(eq(organisations.id, orgId));
      for (const k of kinds) {
        const def = MESSAGE_KINDS[k.kind as keyof typeof MESSAGE_KINDS].body;
        const text = typeof k.body === "string" ? k.body.trim() : "";
        if (!text || text === def) {
          await tx.delete(messageTemplates).where(and(eq(messageTemplates.organisationId, orgId), eq(messageTemplates.kind, k.kind)));
        } else {
          await tx
            .insert(messageTemplates)
            .values({ organisationId: orgId, kind: k.kind, body: text, updatedBy: userId })
            .onConflictDoUpdate({ target: [messageTemplates.organisationId, messageTemplates.kind], set: { body: text, updatedBy: userId, updatedAt: new Date() } });
        }
      }
    });

    void logAudit({ organisationId: orgId, userId, userEmail, action: "update", entityType: "messaging_settings", entityId: orgId, details: { enabled: body.enabled === true, senderId, settings } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving messaging settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
