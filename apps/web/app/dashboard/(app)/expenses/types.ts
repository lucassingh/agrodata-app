export interface ExpenseCategoryRef {
  id: string;
  name: string;
  color: string;
}

export interface Expense {
  id: string;
  categoryId: string;
  amount: number;
  currency: "ARS" | "USD";
  date: Date;
  description: string | null;
  withIva: boolean;
  category: ExpenseCategoryRef;
}

export interface ExpenseByCategory {
  categoryId: string;
  name: string;
  color: string;
  total: number;
  count: number;
}

export interface MonthlyTrend {
  month: string;
  total: number;
}

export interface ExpenseDashboard {
  totalAmount: number;
  byCategory: ExpenseByCategory[];
  monthlyTrends: MonthlyTrend[];
  expenses: Expense[];
}
