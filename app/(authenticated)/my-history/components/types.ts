export interface UnpaidRequest {
  id: number;
  testId: number | null;
  testName: string | null;
  testPrice: number | null;
  departmentName: string | null;
  createdAt: string;
  coveredByPlan: string | null;
  /** HMO's share of the item; testPrice/productPrice is already the patient's own share. */
  hmoCovers: number;
  hmoName: string | null;
}

export interface UnpaidPrescription {
  id: number;
  productId: number | null;
  productName: string | null;
  productPrice: number | null;
  dosage: string;
  createdAt: string;
  coveredByPlan: string | null;
  /** HMO's share of the item; testPrice/productPrice is already the patient's own share. */
  hmoCovers: number;
  hmoName: string | null;
}

/** An unpaid vaccination dose (a patient_charges line). */
export interface UnpaidCharge {
  id: number;
  description: string;
  chargeDate: string;
  createdAt: string;
  amount: number | null;
  /** HMO's share of the item; amount is already the patient's own share. */
  hmoCovers: number;
  hmoName: string | null;
}

export type CartItem =
  | { itemType: "request"; itemId: number; label: string; amount: number }
  | { itemType: "prescription"; itemId: number; label: string; amount: number }
  | { itemType: "charge"; itemId: number; label: string; amount: number };
