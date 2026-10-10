import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { outboundMessages, patients, users } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";

// GET /api/messaging/log?patientId= — recent messages (whole hospital, or one patient).
export async function GET(request: NextRequest) {
  try {
    const patientIdParam = new URL(request.url).searchParams.get("patientId");
    const authz = await requirePermission(
      patientIdParam
        ? [["dashboard", "view"], ["patients", "view"], ["setup", "view"]]
        : [["setup", "view"], ["setup", "edit"]],
    );
    if (authz.error) return authz.error;
    const conds = [eq(outboundMessages.organisationId, authz.ctx.orgId)];
    if (patientIdParam && !isNaN(Number(patientIdParam))) conds.push(eq(outboundMessages.patientId, Number(patientIdParam)));
    const rows = await db
      .select({
        id: outboundMessages.id,
        patientId: outboundMessages.patientId,
        patientFirstname: patients.firstname,
        patientLastname: patients.lastname,
        kind: outboundMessages.kind,
        toPhone: outboundMessages.toPhone,
        body: outboundMessages.body,
        status: outboundMessages.status,
        skipReason: outboundMessages.skipReason,
        provider: outboundMessages.provider,
        error: outboundMessages.error,
        createdAt: outboundMessages.createdAt,
        sentByFirstname: users.firstname,
        sentByLastname: users.lastname,
      })
      .from(outboundMessages)
      .leftJoin(patients, eq(outboundMessages.patientId, patients.id))
      .leftJoin(users, eq(outboundMessages.sentBy, users.id))
      .where(and(...conds))
      .orderBy(desc(outboundMessages.createdAt))
      .limit(200);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching message log:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}
