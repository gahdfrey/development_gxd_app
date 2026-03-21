import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requests } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";

// PATCH /api/requests/[id] - Update payment status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid request ID" }, { status: 400 });
    }

    const body = await request.json();
    const { paymentStatus } = body;

    if (!paymentStatus || !["paid", "not_paid"].includes(paymentStatus)) {
      return NextResponse.json(
        { error: "paymentStatus must be 'paid' or 'not_paid'" },
        { status: 400 },
      );
    }

    const [updated] = await db
      .update(requests)
      .set({ paymentStatus, updatedAt: new Date() })
      .where(eq(requests.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error updating request:", error);
    return NextResponse.json(
      { error: "Failed to update request" },
      { status: 500 },
    );
  }
}
