import "dotenv/config";
import { db } from "./index";
import {
  eligibilityChecks,
  hmoAuthorizationItems,
  hmoAuthorizations,
  hmos,
  patientCharges,
  patientCoverages,
  patients,
  priceListItems,
  priceLists,
  vaccinationDoses,
  vaccines,
} from "./schema";
import { and, eq, isNull } from "drizzle-orm";
import { format, subDays } from "date-fns";
import { createCourse } from "../vaccination";
import { syncPatientMirror } from "../billing/coverage";

/**
 * Test data for the five billing outcomes (lib/billing/pricing.ts), using
 * vaccinations so every case shows up on the Vaccination page, Finance →
 * Vaccinations and the patient record:
 *
 *   Self-pay          TEST Selfpay   — no HMO cover          → full price
 *   Covered           TEST Covered   — vaccine on tariff     → 10% co-pay, HMO pays the rest
 *   Excluded          TEST Excluded  — on tariff, excluded   → full price
 *   Not listed        TEST Notlisted — not on the tariff     → full price
 *   Approval declined TEST Declined  — needs auth, denied    → full price
 *
 * Everything is named "TEST …" (patients, HMO, price list, vaccines) so it's
 * easy to find and remove. Refuses to run twice for the same organisation.
 *
 *   npm run db:seed-billing-scenarios            # organisation 1
 *   npm run db:seed-billing-scenarios -- 23      # another organisation
 */

const HMO_NAME = "TEST HMO (billing scenarios)";

async function seed() {
  const orgId = Number(process.argv[2] ?? 1);
  if (!Number.isInteger(orgId) || orgId <= 0) throw new Error("Usage: seed-billing-scenarios [organisationId]");

  const [existing] = await db
    .select({ id: hmos.id })
    .from(hmos)
    .where(and(eq(hmos.organisationId, orgId), eq(hmos.name, HMO_NAME), isNull(hmos.deletedAt)))
    .limit(1);
  if (existing) {
    console.log(`Already seeded for organisation ${orgId} (HMO #${existing.id}). Nothing to do.`);
    process.exit(0);
  }

  const today = format(new Date(), "yyyy-MM-dd");
  const monthAgo = format(subDays(new Date(), 30), "yyyy-MM-dd");

  const result = await db.transaction(async (tx) => {
    // ── Catalogue ────────────────────────────────────────────────────────────
    const vaccineDefs = {
      covered: { name: "TEST Hepatitis B", price: 6000, description: "TEST — on the HMO tariff, covered (10% co-pay)" },
      excluded: { name: "TEST Yellow Fever", price: 8000, description: "TEST — on the HMO tariff, marked excluded" },
      notListed: { name: "TEST HPV", price: 15000, description: "TEST — not on the HMO tariff" },
      declined: { name: "TEST Rabies", price: 12000, description: "TEST — HMO needs pre-authorization (declined in the test data)" },
    };
    const v: Record<keyof typeof vaccineDefs, typeof vaccines.$inferSelect> = {} as never;
    for (const [key, def] of Object.entries(vaccineDefs) as [keyof typeof vaccineDefs, (typeof vaccineDefs)[keyof typeof vaccineDefs]][]) {
      const [row] = await tx
        .insert(vaccines)
        .values({ organisationId: orgId, ...def, doseCount: 2, intervalValue: 1, intervalUnit: "month" })
        .returning();
      v[key] = row;
    }

    const [hmo] = await tx
      .insert(hmos)
      .values({ organisationId: orgId, name: HMO_NAME, code: "TST", description: "Test payer for the billing scenarios" })
      .returning();
    const [list] = await tx
      .insert(priceLists)
      .values({ organisationId: orgId, name: "TEST HMO tariff", hmoId: hmo.id, effectiveFrom: monthAgo, notes: "Test data" })
      .returning();
    await tx.insert(priceListItems).values([
      // Covered: the HMO's price is ₦5,000 (vs ₦6,000 self-pay); patient pays 10% = ₦500.
      { organisationId: orgId, priceListId: list.id, itemType: "vaccine", itemId: v.covered.id, price: 5000, coverage: "covered", copayPercent: 10 },
      // Excluded: listed, but explicitly not covered.
      { organisationId: orgId, priceListId: list.id, itemType: "vaccine", itemId: v.excluded.id, price: 8000, coverage: "excluded", copayPercent: 0 },
      // Covered only with a pre-authorization — declined below.
      { organisationId: orgId, priceListId: list.id, itemType: "vaccine", itemId: v.declined.id, price: 10000, coverage: "covered", copayPercent: 0, requiresAuthorization: true },
      // (TEST HPV deliberately left off the list → "not listed".)
    ]);

    // ── Patients ─────────────────────────────────────────────────────────────
    const scenarios = [
      { key: "selfpay", firstname: "Selfpay", vaccine: v.covered, hmo: false },
      { key: "covered", firstname: "Covered", vaccine: v.covered, hmo: true },
      { key: "excluded", firstname: "Excluded", vaccine: v.excluded, hmo: true },
      { key: "notlisted", firstname: "Notlisted", vaccine: v.notListed, hmo: true },
      { key: "declined", firstname: "Declined", vaccine: v.declined, hmo: true },
    ] as const;

    const created: { scenario: string; patientId: number; mrn: string; courseId: number }[] = [];
    for (const [i, s] of scenarios.entries()) {
      const [p] = await tx
        .insert(patients)
        .values({
          organisationId: orgId,
          firstname: `TEST ${s.firstname}`,
          lastname: "Billing",
          gender: i % 2 === 0 ? "female" : "male",
          dob: "1990-01-15",
          countryCode: "+234",
          phone: `800000000${i}`,
          insuranceType: s.hmo ? "hmo" : "private",
        })
        .returning({ id: patients.id });
      const mrn = `MRN-${orgId}-${String(p.id).padStart(6, "0")}`;
      await tx.update(patients).set({ mrn }).where(eq(patients.id, p.id));

      if (s.hmo) {
        const [cov] = await tx
          .insert(patientCoverages)
          .values({ organisationId: orgId, patientId: p.id, hmoId: hmo.id, membershipNumber: `TST-${String(i).padStart(4, "0")}`, validFrom: monthAgo, status: "active", notes: "Test data" })
          .returning({ id: patientCoverages.id });
        // Verified today, so the "eligibility not verified" warning doesn't get in the way.
        await tx.insert(eligibilityChecks).values({ organisationId: orgId, coverageId: cov.id, patientId: p.id, channel: "phone", result: "eligible", reference: "TEST" });
        await syncPatientMirror(tx, p.id);

        if (s.key === "declined") {
          // Book first so the doses' bill lines exist, then record the HMO's refusal for them.
          const { courseId } = await createCourse(tx, { orgId, userId: null, patientId: p.id, vaccine: s.vaccine, startDate: today, doseCount: 2, intervalValue: 1, intervalUnit: "month", notes: "Test data" });
          const chargeIds = await tx
            .select({ id: vaccinationDoses.chargeId, description: patientCharges.description })
            .from(vaccinationDoses)
            .innerJoin(patientCharges, eq(vaccinationDoses.chargeId, patientCharges.id))
            .where(eq(vaccinationDoses.courseId, courseId));
          const now = new Date();
          const [auth] = await tx
            .insert(hmoAuthorizations)
            .values({
              organisationId: orgId, patientId: p.id, coverageId: cov.id, hmoId: hmo.id, status: "denied", source: "manual", channel: "phone",
              requestedAt: now, sentAt: now, respondedAt: now, denialReason: "TEST — not covered under the enrollee's plan", notes: "Test data",
            })
            .returning({ id: hmoAuthorizations.id });
          await tx.insert(hmoAuthorizationItems).values(
            chargeIds.map((c) => ({ authorizationId: auth.id, itemType: "charge", itemId: c.id as number, description: c.description, tariffPrice: 10000 })),
          );
          created.push({ scenario: s.firstname, patientId: p.id, mrn, courseId });
          continue;
        }
      }

      const { courseId } = await createCourse(tx, { orgId, userId: null, patientId: p.id, vaccine: s.vaccine, startDate: today, doseCount: 2, intervalValue: 1, intervalUnit: "month", notes: "Test data" });
      created.push({ scenario: s.firstname, patientId: p.id, mrn, courseId });
    }
    return { hmoId: hmo.id, listId: list.id, created };
  });

  console.log(`Seeded billing scenarios for organisation ${orgId}: TEST HMO #${result.hmoId}, price list #${result.listId}`);
  for (const c of result.created) console.log(`  ${c.scenario.padEnd(10)} patient #${c.patientId} (${c.mrn}), vaccination course #${c.courseId}`);
  // Sanity check: show how each case prices, the way checkout will.
  const { priceCourses } = await import("../vaccination");
  const billing = await priceCourses(orgId, result.created.map((c) => c.courseId));
  for (const c of result.created) {
    const b = billing.get(c.courseId);
    console.log(`  ${c.scenario.padEnd(10)} patient pays ${b?.total ?? 0} for 2 doses; HMO pays ${b?.hmoAmount ?? 0}`);
  }
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
