import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { criticalAlerts, patients, users, requests, labTests } from "@/lib/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireAuth } from "@/lib/authz";
import { CRITICAL_ESCALATION_MINUTES } from "@/lib/lab/results";

const notifyUser = alias(users, "notify_user");
const ackUser = alias(users, "ack_user");

// GET /api/critical-alerts?scope=mine|open|recent
//   mine   — unacknowledged alerts addressed to me (the red bar)
//   open   — every unacknowledged alert in the org (lab follow-up list)
//   recent — the last 200 alerts, acknowledged or not
export async function GET(request: NextRequest) {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const { orgId, userId } = authz.ctx;

    const scope = new URL(request.url).searchParams.get("scope") ?? "mine";
    const conditions = [eq(criticalAlerts.organisationId, orgId)];
    if (scope === "mine") conditions.push(eq(criticalAlerts.notifyUserId, userId), isNull(criticalAlerts.acknowledgedAt));
    else if (scope === "open") conditions.push(isNull(criticalAlerts.acknowledgedAt));

    const rows = await db
      .select({
        id: criticalAlerts.id,
        patientId: criticalAlerts.patientId,
        patientFirstname: patients.firstname,
        patientLastname: patients.lastname,
        patientMrn: patients.mrn,
        requestId: criticalAlerts.requestId,
        testName: labTests.name,
        parameterName: criticalAlerts.parameterName,
        value: criticalAlerts.value,
        flag: criticalAlerts.flag,
        raisedAt: criticalAlerts.raisedAt,
        notifyFirstname: notifyUser.firstname,
        notifyLastname: notifyUser.lastname,
        acknowledgedAt: criticalAlerts.acknowledgedAt,
        ackFirstname: ackUser.firstname,
        ackLastname: ackUser.lastname,
        actionNote: criticalAlerts.actionNote,
        escalatedAt: criticalAlerts.escalatedAt,
        escalationNote: criticalAlerts.escalationNote,
      })
      .from(criticalAlerts)
      .leftJoin(patients, eq(criticalAlerts.patientId, patients.id))
      .leftJoin(requests, eq(criticalAlerts.requestId, requests.id))
      .leftJoin(labTests, eq(requests.testId, labTests.id))
      .leftJoin(notifyUser, eq(criticalAlerts.notifyUserId, notifyUser.id))
      .leftJoin(ackUser, eq(criticalAlerts.acknowledgedBy, ackUser.id))
      .where(and(...conditions))
      .orderBy(desc(criticalAlerts.raisedAt))
      .limit(200);

    const now = Date.now();
    return NextResponse.json(
      rows.map((r) => ({
        ...r,
        minutesOpen: r.acknowledgedAt ? null : Math.floor((now - r.raisedAt.getTime()) / 60_000),
        overdue: !r.acknowledgedAt && now - r.raisedAt.getTime() > CRITICAL_ESCALATION_MINUTES * 60_000,
      })),
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching critical alerts:", error);
    return NextResponse.json({ error: "Failed to fetch critical alerts" }, { status: 500 });
  }
}
