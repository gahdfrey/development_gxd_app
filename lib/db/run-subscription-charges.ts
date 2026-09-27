import "dotenv/config";
import { processDueSubscriptions } from "../subscriptions";

/** Manual/local runner for the daily subscription-charge sweep: `npm run cron:subscriptions`. In production, hit POST /api/cron/subscriptions/process from a scheduler instead. */
async function run() {
  const results = await processDueSubscriptions();
  console.log(`Processed ${results.length} subscription(s):`, results);
  process.exit(0);
}

run().catch((err) => {
  console.error("Subscription charge run failed:", err);
  process.exit(1);
});
