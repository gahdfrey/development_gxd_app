/**
 * One-off data fix: drug_generics id 1 was created as "Amlodopine" / "5mg"
 * (typo) but ended up linked to three brands across two actual strengths —
 * Amlodipine 10mg Tablets (10mg), Norvasc 5mg and Amlovasc 5mg (5mg). Splits
 * it into a correctly-named 5mg generic (the existing row, typo fixed) and a
 * new 10mg generic, then re-links the 10mg product and every prescription
 * pointing at it.
 *
 * Usage: DATABASE_URL="..." npx tsx lib/db/fix-amlodipine-generic-split.ts
 */
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client, { schema });

const OLD_GENERIC_ID = 1; // "Amlodopine" / "5mg" -> fixed to "Amlodipine" / "5mg"
const TEN_MG_PRODUCT_ID = 13; // "Amlodipine 10mg Tablets"

async function main() {
  const [oldGeneric] = await db
    .select()
    .from(schema.drugGenerics)
    .where(eq(schema.drugGenerics.id, OLD_GENERIC_ID))
    .limit(1);

  if (!oldGeneric || oldGeneric.name !== "Amlodopine" || oldGeneric.strength !== "5mg") {
    console.log("Generic 1 no longer matches the expected pre-fix state — nothing to do. Found:", oldGeneric);
    await client.end();
    return;
  }

  await db
    .update(schema.drugGenerics)
    .set({ name: "Amlodipine", updatedAt: new Date() })
    .where(eq(schema.drugGenerics.id, OLD_GENERIC_ID));
  console.log(`Fixed typo on generic ${OLD_GENERIC_ID}: "Amlodopine" -> "Amlodipine" (strength stays 5mg)`);

  const [newGeneric] = await db
    .insert(schema.drugGenerics)
    .values({
      organisationId: oldGeneric.organisationId,
      name: "Amlodipine",
      strength: "10mg",
      form: oldGeneric.form,
    })
    .returning();
  console.log(`Created generic ${newGeneric.id}: "Amlodipine" / "10mg"`);

  await db
    .update(schema.products)
    .set({ genericId: newGeneric.id, updatedAt: new Date() })
    .where(eq(schema.products.id, TEN_MG_PRODUCT_ID));
  console.log(`Re-linked product ${TEN_MG_PRODUCT_ID} (Amlodipine 10mg Tablets) -> generic ${newGeneric.id}`);

  const affectedPrescriptions = await db
    .select({ id: schema.prescriptions.id })
    .from(schema.prescriptions)
    .where(eq(schema.prescriptions.productId, TEN_MG_PRODUCT_ID));

  for (const p of affectedPrescriptions) {
    await db
      .update(schema.prescriptions)
      .set({ genericId: newGeneric.id, updatedAt: new Date() })
      .where(eq(schema.prescriptions.id, p.id));
  }
  console.log(`Re-linked ${affectedPrescriptions.length} prescription(s) (${affectedPrescriptions.map((p) => p.id).join(", ")}) -> generic ${newGeneric.id}`);

  console.log("\nDone.");
  await client.end();
}

main().catch(async (err) => {
  console.error(err);
  await client.end();
  process.exit(1);
});
