import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requestResults, requests } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { auth } from "@/auth";

/**
 * PATCH /api/my-history/results/[id]/view
 * Marks a result as viewed by the currently-logged-in patient. Idempotent —
 * the viewed_at timestamp is only set the first time. Strictly patient-only
 * and ownership-scoped: staff accounts (no patientId) can't call this, and a
 * patient can only mark their own results, so a staff member opening a result
 * never clears the patient's "new" indicator.
 */
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = (session.user as any).patientId;
    if (!patientId || typeof patientId !== "number") {
      return NextResponse.json(
        { error: "No patient profile linked to this account" },
        { status: 403 },
      );
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid result ID" }, { status: 400 });
    }

    // Confirm this result belongs to the logged-in patient (via its request).
    const [result] = await db
      .select({ id: requestResults.id, viewedAt: requestResults.viewedAt })
      .from(requestResults)
      .leftJoin(requests, eq(requestResults.requestId, requests.id))
      .where(and(eq(requestResults.id, id), eq(requests.patientId, patientId)))
      .limit(1);

    if (!result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    // Only stamp the first view — keeps the "when did the patient first see
    // this" semantics and makes repeated opens a no-op.
    if (!result.viewedAt) {
      await db
        .update(requestResults)
        .set({ viewedAt: new Date() })
        .where(and(eq(requestResults.id, id), isNull(requestResults.viewedAt)));
    }

    return NextResponse.json({ id, viewed: true }, { status: 200 });
  } catch (error) {
    console.error("Error marking result viewed:", error);
    return NextResponse.json({ error: "Failed to mark result viewed" }, { status: 500 });
  }
}
