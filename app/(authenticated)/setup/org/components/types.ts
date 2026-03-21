export interface TestRow {
  id: number;
  name: string;
  price: number;
  departmentId: number;
  departmentName: string | null;
  createdAt: Date;
  updatedAt: Date;
}
