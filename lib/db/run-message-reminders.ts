import "dotenv/config";
import { processDueReminders } from "../messaging/reminders";

/** Manual/local runner for the appointment-reminder sweep: `npm run cron:messages`. In production, hit POST /api/cron/messages/process every 15 minutes. */
async function run() {
  const results = await processDueReminders();
  console.log(`Sent/logged ${results.length} reminder(s):`, results);
  process.exit(0);
}

run().catch((err) => {
  console.error("Reminder run failed:", err);
  process.exit(1);
});
