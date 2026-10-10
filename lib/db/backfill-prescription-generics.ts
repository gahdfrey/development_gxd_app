/**
 * Backfills `prescriptions.genericId` for legacy rows created before the
 * generic-drug link was required on prescriptions. Resolves the generic via
 * the prescription's own preferred brand (`prescriptions.productId` ->
 * `products.genericId`) — the same FK chain the create flow already trusts.
 * Rows with no preferred brand (or a brand with no generic of its own)
 * can't be resolved automatically and are reported for manual review.
 *
 * Usage: DATABASE_URL="..." npx tsx lib/db/backfill-prescription-generics.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { isNull, eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

async function main() {
  const orphaned = await db
    .select({
      id: schema.prescriptions.id,
      productId: schema.prescriptions.productId,
    })
    .from(schema.prescriptions)
    .where(isNull(schema.prescriptions.genericId));

  console.log(`Found ${orphaned.length} prescription(s) with no genericId...\n`);

  let resolved = 0;
  let unresolved = 0;

  for (const prescription of orphaned) {
    if (!prescription.productId) {
      console.warn(`  ⚠️  Prescription ${prescription.id} has no preferred brand either — needs manual review`);
      unresolved++;
      continue;
    }

    const [product] = await db
      .select({ genericId: schema.products.genericId })
      .from(schema.products)
      .where(eq(schema.products.id, prescription.productId))
      .limit(1);

    if (!product?.genericId) {
      console.warn(
        `  ⚠️  Prescription ${prescription.id}'s brand (product ${prescription.productId}) has no generic linked — needs manual review`,
      );
      unresolved++;
      continue;
    }

    await db
      .update(schema.prescriptions)
      .set({ genericId: product.genericId, updatedAt: new Date() })
      .where(eq(schema.prescriptions.id, prescription.id));

    console.log(`  ✓ Prescription ${prescription.id} -> genericId ${product.genericId}`);
    resolved++;
  }

  console.log(`\nDone. Resolved: ${resolved}, needs manual review: ${unresolved}`);
  await client.end();
}

main().catch(async (err) => {
  console.error(err);
  await client.end();
  process.exit(1);
});
