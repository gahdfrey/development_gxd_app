import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { sendToPatient } from "@/lib/messaging/send";

// POST { patientId, body } — a one-off SMS from staff to a patient (e.g.
// "please come back to collect your results"). Same opt-out / on-off rules.
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["dashboard", "edit"], ["patients", "edit"], ["finance", "edit"], ["laboratory", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;
    const body = await request.json();
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text) return NextResponse.json({ error: "Write the message" }, { status: 400 });
    if (text.length > 480) return NextResponse.json({ error: "Keep it under 480 characters (3 SMS)" }, { status: 400 });

    const out = await sendToPatient({ orgId, patientId: Number(body.patientId), kind: "custom", body: text, sentBy: userId });
    void logAudit({ organisationId: orgId, userId, userEmail, action: "sms.custom", entityType: "patient", entityId: Number(body.patientId), details: { status: out.status, reason: out.reason } });
    if (out.status === "not_sent") return NextResponse.json({ error: out.reason }, { status: 400 });
    if (out.status !== "sent") return NextResponse.json({ error: out.reason ?? "Not sent" }, { status: 400 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error sending SMS:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
