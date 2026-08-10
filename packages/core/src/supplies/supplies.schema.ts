import { z } from "zod";

export const createSupplySchema = z.object({
  categoryId: z.string().min(1, "Elegí una categoría"),
  name: z.string().trim().min(1, "Ingresá el nombre del insumo").max(200),
  quantity: z.number().nonnegative("La cantidad no puede ser negativa").optional(),
  unit: z.string().trim().max(50).optional(),
  cost: z.number().optional(),
  currency: z.enum(["ARS", "USD"]).optional(),
  supplier: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
});
export type CreateSupplyInput = z.infer<typeof createSupplySchema>;

export const updateSupplySchema = createSupplySchema.partial();
export type UpdateSupplyInput = z.infer<typeof updateSupplySchema>;

export const adjustSupplyStockSchema = z.object({
  amount: z.number().positive("Ingresá una cantidad mayor a 0"),
  direction: z.enum(["in", "out"]),
});
export type AdjustSupplyStockInput = z.infer<typeof adjustSupplyStockSchema>;
