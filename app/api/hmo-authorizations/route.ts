import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  hmoAuthorizations,
  hmoAuthorizationItems,
  hmos,
  patients,
  patientCoverages,
  users,
} from "@/lib/db/schema";
import { and, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { priceBillItems, itemKey, type BillItemRef } from "@/lib/billing/pricing";
import { AUTH_CHANNELS, authorizationSla, createAuthorization, getItemAuthorizations } from "@/lib/billing/authorizations";

const STATUSES = ["pending", "approved", "denied", "cancelled"] as const;

const requester = alias(users, "requester");
const responder = alias(users, "responder");

// GET /api/hmo-authorizations?status=&hmoId=&month=YYYY-MM
// The pre-authorization log / worklist. Without a status filter, pending
// requests come first (unsent, then longest-waiting), then the rest newest first.
export async function GET(request: NextRequest) {
  try {
    const authz = await requirePermission([["finance", "view"]]);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const hmoId = searchParams.get("hmoId");
    const month = searchParams.get("month");

    const conditions = [eq(hmoAuthorizations.organisationId, orgId)];
    if (status && (STATUSES as readonly string[]).includes(status)) conditions.push(eq(hmoAuthorizations.status, status));
    if (hmoId && !isNaN(Number(hmoId))) conditions.push(eq(hmoAuthorizations.hmoId, Number(hmoId)));
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split("-").map(Number);
      conditions.push(
        gte(hmoAuthorizations.requestedAt, new Date(Date.UTC(y, m - 1, 1, -1))),
        lt(hmoAuthorizations.requestedAt, new Date(Date.UTC(y, m, 1, -1))),
      );
    }

    const rows = await db
      .select({
        id: hmoAuthorizations.id,
        status: hmoAuthorizations.status,
        source: hmoAuthorizations.source,
        channel: hmoAuthorizations.channel,
        isEmergency: hmoAuthorizations.isEmergency,
        requestedAt: hmoAuthorizations.requestedAt,
        sentAt: hmoAuthorizations.sentAt,
        respondedAt: hmoAuthorizations.respondedAt,
        code: hmoAuthorizations.code,
        validUntil: hmoAuthorizations.validUntil,
        denialReason: hmoAuthorizations.denialReason,
        escalatedAt: hmoAuthorizations.escalatedAt,
        escalationNote: hmoAuthorizations.escalationNote,
        notes: hmoAuthorizations.notes,
        patientId: hmoAuthorizations.patientId,
        patientFirstname: patients.firstname,
        patientLastname: patients.lastname,
        patientMrn: patients.mrn,
        hmoId: hmoAuthorizations.hmoId,
        hmoName: hmos.name,
        hmoPhone: hmos.phone,
        hmoEmail: hmos.email,
        membershipNumber: patientCoverages.membershipNumber,
        requestedByFirstname: requester.firstname,
        requestedByLastname: requester.lastname,
        respondedByFirstname: responder.firstname,
        respondedByLastname: responder.lastname,
      })
      .from(hmoAuthorizations)
      .leftJoin(patients, eq(hmoAuthorizations.patientId, patients.id))
      .leftJoin(hmos, eq(hmoAuthorizations.hmoId, hmos.id))
      .leftJoin(patientCoverages, eq(hmoAuthorizations.coverageId, patientCoverages.id))
      .leftJoin(requester, eq(hmoAuthorizations.requestedBy, requester.id))
      .leftJoin(responder, eq(hmoAuthorizations.respondedBy, responder.id))
      .where(and(...conditions))
      .orderBy(desc(hmoAuthorizations.requestedAt))
      .limit(500);

    const items = rows.length > 0
      ? await db
          .select()
          .from(hmoAuthorizationItems)
          .where(inArray(hmoAuthorizationItems.authorizationId, rows.map((r) => r.id)))
      : [];

    const result = rows.map((r) => ({
      ...r,
      sla: authorizationSla(r),
      items: items.filter((i) => i.authorizationId === r.id),
    }));
    // Worklist order: pending first — unsent ones (nothing has started the
    // clock) then the longest-waiting sent ones; everything else newest first.
    result.sort((a, b) => {
      const rank = (x: typeof a) => (x.status === "pending" ? (x.sentAt ? 1 : 0) : 2);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (a.status === "pending" && a.sentAt && b.sentAt) {
        return new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime();
      }
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error fetching HMO authorizations:", error);
    return NextResponse.json({ error: "Failed to fetch authorizations" }, { status: 500 });
  }
}

// POST /api/hmo-authorizations — log a pre-authorization request made by the
// desk. Body: { patientId, items: [{itemType, itemId}], channel, isEmergency?,
// notes?, sent? (default true), code?, validUntil? (code already obtained) }
export async function POST(request: NextRequest) {
  try {
    const authz = await requirePermission([["finance", "add"], ["finance", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const body = await request.json();
    const patientId = Number(body.patientId);
    const refs: BillItemRef[] = Array.isArray(body.items)
      ? body.items
          .filter((i: { itemType?: string; itemId?: unknown }) => (i.itemType === "request" || i.itemType === "prescription" || i.itemType === "charge") && Number.isInteger(i.itemId))
          .map((i: BillItemRef) => ({ itemType: i.itemType, itemId: i.itemId }))
      : [];
    if (!Number.isInteger(patientId)) return NextResponse.json({ error: "Select the patient" }, { status: 400 });
    if (refs.length === 0) return NextResponse.json({ error: "Select at least one service to authorize" }, { status: 400 });
    if (body.channel && !(AUTH_CHANNELS as readonly string[]).includes(body.channel)) {
      return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
    }
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const validUntil = typeof body.validUntil === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.validUntil) ? body.validUntil : null;

    const priced = await priceBillItems(orgId, refs);
    const items = [...priced.values()];
    if (items.length !== refs.length || items.some((p) => p.patientId !== patientId)) {
      return NextResponse.json({ error: "One or more services were not found for this patient" }, { status: 404 });
    }
    if (items.some((p) => (p.basis !== "covered" && p.basis !== "auth_declined") || p.coverageId == null)) {
      return NextResponse.json(
        { error: "Only services covered by the patient's HMO tariff need an authorization" },
        { status: 400 },
      );
    }
    if (new Set(items.map((p) => p.coverageId)).size > 1) {
      return NextResponse.json({ error: "All services must be under the same HMO coverage" }, { status: 400 });
    }

    const existing = await getItemAuthorizations(db, orgId, items);
    const blocked = items.filter((p) => {
      const a = existing.get(itemKey(p.itemType, p.itemId));
      return a && (a.status === "pending" || a.status === "approved");
    });
    if (blocked.length > 0) {
      return NextResponse.json(
        { error: `${blocked.map((b) => b.description ?? "A service").join(", ")} already has an open or approved authorization` },
        { status: 409 },
      );
    }

    const auth = await db.transaction((tx) =>
      createAuthorization(tx, {
        orgId,
        actorId: userId,
        items,
        source: "manual",
        channel: body.channel ?? null,
        isEmergency: body.isEmergency === true,
        notes: typeof body.notes === "string" && body.notes.trim() ? body.notes.trim() : null,
        sent: body.sent !== false,
        approved: code ? { code, validUntil } : undefined,
      }),
    );

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "create",
      entityType: "hmo_authorization",
      entityId: auth.id,
      details: { source: "manual", patientId, hmoId: auth.hmoId, status: auth.status, items: refs.map((r) => itemKey(r.itemType, r.itemId)) },
    });

    return NextResponse.json(auth, { status: 201 });
  } catch (error) {
    console.error("Error creating HMO authorization:", error);
    return NextResponse.json({ error: "Failed to create authorization" }, { status: 500 });
  }
}
