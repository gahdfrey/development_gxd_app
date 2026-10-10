import { NextRequest, NextResponse } from "next/server";
import { processDueReminders } from "@/lib/messaging/reminders";

/**
 * Appointment reminder sweep — hit every 15 minutes by an external scheduler
 * with `Authorization: Bearer <CRON_SECRET>` (idempotent, so a more
 * frequent schedule is fine). Locally: `npm run cron:messages`.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const results = await processDueReminders();
    return NextResponse.json({ processed: results.length, results });
  } catch (error) {
    console.error("Error processing reminders:", error);
    return NextResponse.json({ error: "Failed to process reminders" }, { status: 500 });
  }
}
