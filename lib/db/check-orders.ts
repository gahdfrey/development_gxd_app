import "dotenv/config";
import { db } from "./index";
import { supplyOrders } from "./schema";

async function main() {
  const rows = await db.select({
    id: supplyOrders.id,
    status: supplyOrders.status,
    departmentId: supplyOrders.departmentId,
    cancellationReason: supplyOrders.cancellationReason,
  }).from(supplyOrders).limit(10);
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
