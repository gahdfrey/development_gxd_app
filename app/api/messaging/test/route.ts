import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { organisations, outboundMessages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { getMessagingGateway } from "@/lib/messaging";
import { toMsisdn } from "@/lib/messaging/phone";

// POST { phone } — send a test SMS to a staff phone (works even while SMS is
// switched off, so the hospital can check its sender ID first).
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["setup", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId } = authz.ctx;
    const { phone } = await request.json();
    const to = toMsisdn("+234", typeof phone === "string" ? phone : "");
    if (!to) return NextResponse.json({ error: "Enter a valid Nigerian mobile number" }, { status: 400 });
    const [org] = await db.select({ name: organisations.name, senderId: organisations.smsSenderId }).from(organisations).where(eq(organisations.id, orgId)).limit(1);
    const gateway = getMessagingGateway();
    const body = `Test message from ${org?.name ?? "CareVault"}. Patient SMS is set up correctly.`;
    const result = await gateway.send({ to, body, senderId: org?.senderId ?? null });
    await db.insert(outboundMessages).values({
      organisationId: orgId,
      kind: "test",
      toPhone: to,
      body,
      status: result.ok ? "sent" : "failed",
      provider: gateway.provider,
      providerRef: result.providerRef,
      error: result.error ?? null,
      sentBy: userId,
    });
    if (!result.ok) return NextResponse.json({ error: result.error || "Send failed" }, { status: 502 });
    return NextResponse.json({ success: true, live: gateway.live, provider: gateway.provider });
  } catch (error) {
    console.error("Error sending test SMS:", error);
    return NextResponse.json({ error: "Failed to send test" }, { status: 500 });
  }
}
