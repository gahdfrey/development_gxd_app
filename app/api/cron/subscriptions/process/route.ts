import { NextRequest, NextResponse } from "next/server";
import { processDueSubscriptions } from "@/lib/subscriptions";

/**
 * Meant to be hit once a day by an external scheduler (e.g. Vercel Cron)
 * with `Authorization: Bearer <CRON_SECRET>`. No user session — this is a
 * system job, not a user action. For local/manual runs, use
 * `npm run cron:subscriptions` instead (lib/db/run-subscription-charges.ts),
 * which calls the same processDueSubscriptions() directly.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await processDueSubscriptions();
    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    console.error("Error processing due subscriptions:", error);
    return NextResponse.json({ error: "Failed to process subscriptions" }, { status: 500 });
  }
}
