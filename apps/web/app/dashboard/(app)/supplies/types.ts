export interface SupplyCategoryRef {
  id: string;
  name: string;
  code: string | null;
  color: string | null;
}

export interface Supply {
  id: string;
  categoryId: string;
  name: string;
  quantity: number;
  unit: string | null;
  cost: number | null;
  currency: "ARS" | "USD";
  supplier: string | null;
  notes: string | null;
  category: SupplyCategoryRef;
}
