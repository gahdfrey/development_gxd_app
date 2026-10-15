export interface TestRow {
  id: number;
  name: string;
  price: number;
  taxCode?: "zero_rated" | "standard" | "exempt";
  departmentId: number;
  departmentName: string | null;
  refDiscountType: "amount" | "percent" | null;
  refDiscountValue: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReferrerRow {
  id: number;
  code: string | null;
  name: string;
  accountName: string;
  accountNumber: string;
  bank: string;
  whatsappNumber: string;
  createdAt: string;
}
