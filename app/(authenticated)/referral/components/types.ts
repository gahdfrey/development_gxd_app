export interface ReferredPatientRow {
  patientId: number;
  firstname: string;
  lastname: string;
  mrn: string | null;
  registeredAt: string;
  referrerId: number;
  referrerName: string;
  referrerCode: string | null;
  tests: string;
  totalAmount: number;
  amountOwed: number;
  pendingAmount: number;
  testCount: number;
  paidCount: number;
}

export interface ReferrerSummaryRow {
  id: number;
  code: string | null;
  name: string;
  bank: string;
  accountNumber: string;
  whatsappNumber: string;
  deletedAt: string | null;
  patientCount: number;
  testCount: number;
  totalAmount: number;
  amountOwed: number;
  pendingAmount: number;
}

export interface StatementLine {
  id: number;
  patientId: number;
  firstname: string;
  lastname: string;
  mrn: string | null;
  registeredAt: string;
  testName: string;
  departmentName: string | null;
  amount: number;
  discountType: string | null;
  discountValue: number | null;
  discountAmount: number;
  paymentStatus: string | null; // "paid" | "not_paid" | "waived"
}

export interface ReferrerStatement {
  organisation: { name: string; address: string | null; phone: string | null } | null;
  referrer: {
    id: number;
    code: string | null;
    name: string;
    accountName: string;
    accountNumber: string;
    bank: string;
    whatsappNumber: string;
    deletedAt: string | null;
  };
  lines: StatementLine[];
  totals: { patients: number; tests: number; paidTests: number; amount: number; amountOwed: number; pendingAmount: number };
}

export const naira = (n: number) => `₦${n.toLocaleString()}`;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Lagos" });

export const PAYMENT_LABEL: Record<string, string> = { paid: "Paid", not_paid: "Not paid", waived: "Waived" };

/** Soft-fill + hairline-ring status pill classes, matching the rest of the app. */
export const PAYMENT_PILL: Record<string, string> = {
  paid: "bg-green-50 text-green-700 ring-green-200",
  not_paid: "bg-amber-50 text-amber-700 ring-amber-200",
  waived: "bg-gray-100 text-gray-600 ring-gray-200",
};
