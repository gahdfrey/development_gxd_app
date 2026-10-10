export interface TestRow {
  id: number;
  name: string;
  price: number;
  taxCode?: "zero_rated" | "standard" | "exempt";
  departmentId: number;
  departmentName: string | null;
  createdAt: Date;
  updatedAt: Date;
}
