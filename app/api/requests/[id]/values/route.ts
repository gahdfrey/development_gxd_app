import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requirePermission } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { FLAG_LABEL } from "@/lib/lab/flags";
import { displayValue, getValuesForRequests, loadRequestForResults, parametersForPatient } from "@/lib/lab/results";
import { saveResultValues, type ResultInput } from "@/lib/lab/save";
import { notifyResultsReady } from "@/lib/messaging/events";

type Params = { params: Promise<{ id: string }> };

// GET /api/requests/[id]/values — the result-entry form's data: the test's
// fields (with this patient's reference ranges) and any values entered.
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([
      ["laboratory", "view"],
      ["radiography", "view"],
      ["patient-history", "view"],
      ["my-appointments", "view"],
      ["appointments", "view"],
      ["admission", "view"],
    ]);
    if (authz.error) return authz.error;
    const { orgId } = authz.ctx;

    const requestId = parseInt((await params).id);
    if (isNaN(requestId)) return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    const req = await loadRequestForResults(db, orgId, requestId);
    if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });

    const parameters = await parametersForPatient(db, req.testId, { gender: req.patientGender, dob: req.patientDob });
    const values = (await getValuesForRequests(db, orgId, [req.id])).get(req.id) ?? [];
    return NextResponse.json({ request: req, parameters, values }, { status: 200 });
  } catch (error) {
    console.error("Error fetching result values:", error);
    return NextResponse.json({ error: "Failed to fetch results" }, { status: 500 });
  }
}

/**
 * PUT /api/requests/[id]/values { values: [{ parameterId, value, comment? }] }
 * Saves (or corrects) structured results. Each value is flagged against the
 * patient's reference range; values past a critical limit raise a critical
 * alert to the ordering clinician, who must acknowledge it. Blank values are
 * skipped (an entered value can be corrected but not blanked).
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const authz = await requirePermission([
      ["laboratory", "add"],
      ["laboratory", "edit"],
      ["radiography", "add"],
      ["radiography", "edit"],
    ]);
    if (authz.error) return authz.error;
    const { orgId, userId, userEmail } = authz.ctx;

    const requestId = parseInt((await params).id);
    if (isNaN(requestId)) return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    const req = await loadRequestForResults(db, orgId, requestId);
    if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });
    if (req.paymentStatus !== "paid") {
      return NextResponse.json({ error: "Cannot enter results for an unpaid request" }, { status: 400 });
    }

    const body = await request.json();
    const input: ResultInput[] = Array.isArray(body.values) ? body.values : [];
    const outcome = await db.transaction((tx) => saveResultValues(tx, { orgId, userId, req, input }));
    if ("error" in outcome) return NextResponse.json({ error: outcome.error }, { status: 400 });
    const { saved, newCriticals } = outcome;

    // Tell the ordering clinician (existing notification bell).
    try {
      const flagged = saved.filter((s) => s.flag !== "normal");
      const message = newCriticals.length
        ? `CRITICAL RESULT — ${newCriticals.map((c) => `${c.name} ${displayValue(c)} (${FLAG_LABEL[c.flag as keyof typeof FLAG_LABEL]})`).join("; ")}. Acknowledge in CareVault.`
        : flagged.length
          ? `Results ready — ${flagged.length} abnormal: ${flagged.map((f) => `${f.name} ${displayValue(f)}`).join("; ")}`
          : "Results ready — all within normal range";
      await db.insert(notifications).values({
        userId: req.requestedBy,
        requestId: req.id,
        patientFirstname: req.patientFirstname,
        patientLastname: req.patientLastname,
        departmentName: req.departmentName,
        message,
      });
    } catch (err) {
      console.error("Failed to notify requester:", err);
    }

    // Tell the patient their result is ready — except a new critical value,
    // which the doctor must see (and acknowledge) first.
    if (newCriticals.length === 0) await notifyResultsReady(orgId, req.patientId, req.id, req.testName);

    void logAudit({
      organisationId: orgId,
      userId,
      userEmail,
      action: "update",
      entityType: "lab_result_values",
      entityId: req.id,
      details: {
        test: req.testName,
        values: saved.map((s) => ({ name: s.name, value: displayValue(s), flag: s.flag })),
        criticals: newCriticals.length,
      },
    });

    return NextResponse.json({ saved: saved.length, criticals: newCriticals.length }, { status: 200 });
  } catch (error) {
    console.error("Error saving result values:", error);
    return NextResponse.json({ error: "Failed to save results" }, { status: 500 });
  }
}
