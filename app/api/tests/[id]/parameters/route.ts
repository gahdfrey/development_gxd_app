import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { labTests, labTestParameters, type NewLabTestParameter } from "@/lib/db/schema";
import { and, asc, eq, isNull, notInArray } from "drizzle-orm";
import { requireAuth, requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";

type Params = { params: Promise<{ id: string }> };

async function findTest(orgId: number, idParam: string) {
  const id = parseInt(idParam);
  if (isNaN(id)) return null;
  const [t] = await db
    .select({ id: labTests.id, name: labTests.name })
    .from(labTests)
    .where(and(eq(labTests.id, id), eq(labTests.organisationId, orgId), isNull(labTests.deletedAt)))
    .limit(1);
  return t ?? null;
}

// GET /api/tests/[id]/parameters — the test's result fields.
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requireAuth();
    if (authz.error) return authz.error;
    const test = await findTest(authz.ctx.orgId, (await params).id);
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    const rows = await db
      .select()
      .from(labTestParameters)
      .where(and(eq(labTestParameters.testId, test.id), isNull(labTestParameters.deletedAt)))
      .orderBy(asc(labTestParameters.sortOrder), asc(labTestParameters.id));
    return NextResponse.json({ test, parameters: rows }, { status: 200 });
  } catch (error) {
    console.error("Error fetching test parameters:", error);
    return NextResponse.json({ error: "Failed to fetch result fields" }, { status: 500 });
  }
}

const num = (v: unknown) => (v === undefined || v === null || v === "" ? null : Number(v));

// PUT /api/tests/[id]/parameters { parameters: [...] } — replace the test's
// result fields: rows with an id are updated, new rows inserted, and rows
// left out are retired (soft-deleted, so past results keep their field).
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([["setup", "edit"], ["setup", "add"], ["laboratory", "edit"]]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const test = await findTest(orgId, (await params).id);
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    const body = await request.json();
    const input: Record<string, unknown>[] = Array.isArray(body.parameters) ? body.parameters : [];

    const cleaned: { id: number | null; values: Omit<NewLabTestParameter, "organisationId" | "testId"> }[] = [];
    for (const [i, p] of input.entries()) {
      const name = typeof p.name === "string" ? p.name.trim() : "";
      if (!name) return NextResponse.json({ error: `Field ${i + 1} needs a name` }, { status: 400 });
      const valueType = p.valueType as string;
      if (!["numeric", "choice", "text"].includes(valueType)) return NextResponse.json({ error: `“${name}”: invalid type` }, { status: 400 });
      const choices = Array.isArray(p.choices) ? (p.choices as unknown[]).map(String).map((c) => c.trim()).filter(Boolean) : null;
      if (valueType === "choice" && (!choices || choices.length < 2)) {
        return NextResponse.json({ error: `“${name}”: list at least two options` }, { status: 400 });
      }
      const abnormal = Array.isArray(p.abnormalChoices) ? (p.abnormalChoices as unknown[]).map(String).filter((c) => choices?.includes(c)) : null;
      const nums = { refLow: num(p.refLow), refHigh: num(p.refHigh), criticalLow: num(p.criticalLow), criticalHigh: num(p.criticalHigh) };
      if (Object.values(nums).some((v) => v != null && !Number.isFinite(v))) {
        return NextResponse.json({ error: `“${name}”: ranges must be numbers` }, { status: 400 });
      }
      if (nums.refLow != null && nums.refHigh != null && nums.refLow > nums.refHigh) {
        return NextResponse.json({ error: `“${name}”: normal range low is above high` }, { status: 400 });
      }
      if (nums.criticalLow != null && nums.refLow != null && nums.criticalLow > nums.refLow) {
        return NextResponse.json({ error: `“${name}”: critical low should be below the normal range` }, { status: 400 });
      }
      if (nums.criticalHigh != null && nums.refHigh != null && nums.criticalHigh < nums.refHigh) {
        return NextResponse.json({ error: `“${name}”: critical high should be above the normal range` }, { status: 400 });
      }
      cleaned.push({
        id: Number.isInteger(p.id) ? (p.id as number) : null,
        values: {
          name,
          code: typeof p.code === "string" && p.code.trim() ? p.code.trim() : null,
          unit: typeof p.unit === "string" && p.unit.trim() ? p.unit.trim() : null,
          valueType,
          choices: valueType === "choice" ? choices : null,
          abnormalChoices: valueType === "choice" ? abnormal : null,
          ...(valueType === "numeric" ? nums : { refLow: null, refHigh: null, criticalLow: null, criticalHigh: null }),
          refRanges: valueType === "numeric" && Array.isArray(p.refRanges) ? (p.refRanges as never) : null,
          decimals: num(p.decimals),
          sortOrder: i,
        },
      });
    }

    await db.transaction(async (tx) => {
      const keepIds = cleaned.map((c) => c.id).filter((v): v is number => v != null);
      await tx
        .update(labTestParameters)
        .set({ deletedAt: new Date() })
        .where(and(
          eq(labTestParameters.testId, test.id),
          isNull(labTestParameters.deletedAt),
          ...(keepIds.length ? [notInArray(labTestParameters.id, keepIds)] : []),
        ));
      for (const c of cleaned) {
        if (c.id != null) {
          await tx
            .update(labTestParameters)
            .set({ ...c.values, updatedAt: new Date() })
            .where(and(eq(labTestParameters.id, c.id), eq(labTestParameters.testId, test.id)));
        } else {
          await tx.insert(labTestParameters).values({ ...c.values, organisationId: orgId, testId: test.id });
        }
      }
    });

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "update",
      entityType: "lab_test_parameters",
      entityId: test.id,
      details: { test: test.name, fields: cleaned.map((c) => c.values.name) },
    });

    return NextResponse.json({ success: true, count: cleaned.length }, { status: 200 });
  } catch (error) {
    console.error("Error saving test parameters:", error);
    return NextResponse.json({ error: "Failed to save result fields" }, { status: 500 });
  }
}
