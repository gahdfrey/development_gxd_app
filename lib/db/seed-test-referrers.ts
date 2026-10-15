import "dotenv/config";
import { db } from "./index";
import { referrers, labTests } from "./schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { referrerCode } from "../referrals";

/**
 * Test data for the referral module, for one organisation:
 *  - five sample referrers (skipped if a referrer with the same account
 *    number already exists), and
 *  - a referral discount on every test that has none yet (10%).
 *
 * Usage: npx tsx lib/db/seed-test-referrers.ts <organisationId>
 */

const SAMPLE_REFERRERS = [
  { name: "Dr. Adaeze Okafor", accountName: "Adaeze Okafor", accountNumber: "0123456789", bank: "Access Bank", whatsappNumber: "+2348031234567" },
  { name: "Mercy Clinic Ikeja", accountName: "Mercy Clinic Ltd", accountNumber: "2034567891", bank: "GTBank", whatsappNumber: "+2348052345678" },
  { name: "Dr. Tunde Bakare", accountName: "Babatunde Bakare", accountNumber: "3045678912", bank: "First Bank", whatsappNumber: "+2348073456789" },
  { name: "Grace Pharmacy", accountName: "Grace Pharmacy Enterprises", accountNumber: "4056789123", bank: "Zenith Bank", whatsappNumber: "+2348094567890" },
  { name: "Nurse Halima Yusuf", accountName: "Halima Yusuf", accountNumber: "5067891234", bank: "UBA", whatsappNumber: "+2348105678901" },
];

async function seed() {
  const orgId = parseInt(process.argv[2] ?? "");
  if (!orgId) {
    console.error("Usage: npx tsx lib/db/seed-test-referrers.ts <organisationId>");
    process.exit(1);
  }

  let created = 0;
  for (const r of SAMPLE_REFERRERS) {
    const [existing] = await db
      .select({ id: referrers.id })
      .from(referrers)
      .where(and(eq(referrers.organisationId, orgId), eq(referrers.accountNumber, r.accountNumber), isNull(referrers.deletedAt)))
      .limit(1);
    if (existing) {
      console.log(`  skipped (exists): ${r.name}`);
      continue;
    }
    const [row] = await db.insert(referrers).values({ organisationId: orgId, ...r }).returning({ id: referrers.id });
    await db.update(referrers).set({ code: referrerCode(row.id) }).where(eq(referrers.id, row.id));
    console.log(`  created: ${referrerCode(row.id)} ${r.name}`);
    created++;
  }

  const updated = await db
    .update(labTests)
    .set({ refDiscountType: "percent", refDiscountValue: 10, updatedAt: new Date() })
    .where(and(eq(labTests.organisationId, orgId), isNull(labTests.deletedAt), sql`${labTests.refDiscountType} IS NULL`))
    .returning({ id: labTests.id });

  console.log(`\nDone. ${created} referrer(s) created; 10% referral discount set on ${updated.length} test(s).`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
