export interface UnpaidRequest {
  id: number;
  testName: string | null;
  testPrice: number | null;
  departmentName: string | null;
  createdAt: string;
}

export interface UnpaidPrescription {
  id: number;
  productName: string | null;
  productPrice: number | null;
  dosage: string;
  createdAt: string;
}

export type CartItem =
  | { itemType: "request"; itemId: number; label: string; amount: number }
  | { itemType: "prescription"; itemId: number; label: string; amount: number };
