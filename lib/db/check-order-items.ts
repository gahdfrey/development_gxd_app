import "dotenv/config";
import { db } from "./index";
import { supplyOrderItems, products } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  const items = await db
    .select({
      id: supplyOrderItems.id,
      orderId: supplyOrderItems.orderId,
      productId: supplyOrderItems.productId,
      inventoryItemId: supplyOrderItems.inventoryItemId,
      quantityRequested: supplyOrderItems.quantityRequested,
      productName: products.name,
      casesInStock: products.casesInStock,
      unitsPerCase: products.unitsPerCase,
      looseUnitsInStock: products.looseUnitsInStock,
    })
    .from(supplyOrderItems)
    .leftJoin(products, eq(supplyOrderItems.productId, products.id))
    .where(eq(supplyOrderItems.orderId, 1));

  console.log(JSON.stringify(items, null, 2));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
