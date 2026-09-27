import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { walletTransactions, patients } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { getOrCreateWallet } from "@/lib/wallet";

/** The logged-in patient's wallet balance + recent ledger history. */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const patientId = (session.user as any).patientId;
    if (!patientId || typeof patientId !== "number") {
      return NextResponse.json({ error: "No patient profile linked to this account" }, { status: 403 });
    }

    const [patient] = await db
      .select({ organisationId: patients.organisationId })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

    const wallet = await getOrCreateWallet(patientId, patient.organisationId);

    const transactions = await db
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.walletId, wallet.id))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(50);

    return NextResponse.json({ wallet, transactions });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return NextResponse.json({ error: "Failed to fetch wallet" }, { status: 500 });
  }
}
