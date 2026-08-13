import { z } from "zod";

export const createExpenseSchema = z.object({
  categoryId: z.string().min(1, "Elegí una categoría de gasto"),
  amount: z.number().positive("Ingresá un importe válido mayor a 0"),
  currency: z.enum(["ARS", "USD"]).optional(),
  date: z.string().min(1, "Elegí una fecha"),
  description: z.string().trim().max(500).optional(),
  withIva: z.boolean().optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

export const updateExpenseSchema = z.object({
  categoryId: z.string().optional(),
  amount: z.number().positive("Ingresá un importe válido mayor a 0").optional(),
  currency: z.enum(["ARS", "USD"]).optional(),
  date: z.string().optional(),
  description: z.string().trim().optional(),
  withIva: z.boolean().optional(),
});
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const expenseFiltersSchema = z.object({
  currency: z.enum(["ARS", "USD"]).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type ExpenseFilters = z.infer<typeof expenseFiltersSchema>;
