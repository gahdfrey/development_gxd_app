export interface UnpaidRequest {
  id: number;
  testId: number | null;
  testName: string | null;
  testPrice: number | null;
  departmentName: string | null;
  createdAt: string;
  coveredByPlan: string | null;
}

export interface UnpaidPrescription {
  id: number;
  productId: number | null;
  productName: string | null;
  productPrice: number | null;
  dosage: string;
  createdAt: string;
  coveredByPlan: string | null;
}

export type CartItem =
  | { itemType: "request"; itemId: number; label: string; amount: number }
  | { itemType: "prescription"; itemId: number; label: string; amount: number };
