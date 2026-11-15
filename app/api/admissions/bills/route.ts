import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { admissions, wards, beds } from "@/lib/db/schema";
import { and, desc, eq, gt, or } from "drizzle-orm";
import { requirePermission } from "@/lib/authz";
import { getAdmissionBill, syncBedDayCharges } from "@/lib/billing/admissionBill";

const BATCH = 3;

// GET /api/admissions/bills — running bills for everyone currently admitted,
// plus discharged patients who left with a balance (finance follow-up).
export async function GET() {
  try {
    const authz = await requirePermission([["finance", "view"]]);
    if (authz.error) return authz.error;
    const { orgId, userId } = authz.ctx;
    const rows = await db
      .select({ id: admissions.id, status: admissions.status, wardName: wards.name, bedNumber: beds.bedNumber })
      .from(admissions)
      .leftJoin(wards, eq(admissions.wardId, wards.id))
      .leftJoin(beds, eq(admissions.bedId, beds.id))
      .where(and(eq(admissions.organisationId, orgId), or(eq(admissions.status, "admitted"), and(eq(admissions.status, "discharged"), gt(admissions.dischargeBalance, 0)))))
      .orderBy(desc(admissions.admittedAt))
      .limit(200);

    // Each bill takes several round trips to the database, so build them a
    // few at a time instead of one after another (the pool has 10 connections
    // and each bill runs up to 4 queries at once).
    const build = async (r: (typeof rows)[number]) => {
      if (r.status === "admitted") await syncBedDayCharges(db, orgId, r.id, userId);
      const bill = await getAdmissionBill(db, orgId, r.id);
      if (!bill) return null;
      // Discharged patients stay listed only while they still owe.
      if (r.status === "discharged" && bill.totals.outstanding <= 0) return null;
      return {
        admissionId: r.id,
        status: r.status,
        wardName: r.wardName,
        bedNumber: r.bedNumber,
        patientId: bill.admission.patientId,
        patientFirstname: bill.admission.patientFirstname,
        patientLastname: bill.admission.patientLastname,
        patientMrn: bill.admission.patientMrn,
        admittedAt: bill.admission.admittedAt,
        dischargedAt: bill.admission.dischargedAt,
        dischargeBalanceNote: bill.admission.dischargeBalanceNote,
        totals: bill.totals,
        walletBalance: bill.walletBalance,
        hmoName: bill.lines.find((l) => l.priced?.hmoName)?.priced?.hmoName ?? null,
      };
    };
    const out = [];
    for (let i = 0; i < rows.length; i += BATCH) {
      const built = await Promise.all(rows.slice(i, i + BATCH).map(build));
      for (const b of built) if (b) out.push(b);
    }
    return NextResponse.json(out);
  } catch (error) {
    console.error("Error listing admission bills:", error);
    return NextResponse.json({ error: "Failed to load bills" }, { status: 500 });
  }
}
