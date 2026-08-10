import { z } from "zod";

export const tenantCategorySchema = z.enum([
  "FIELD_AGRICOLA",
  "GANADERO",
  "TAMBO",
  "MIXTO",
]);

export const createTenantSchema = z.object({
  name: z.string().trim().min(1, "Ingresá el nombre del campo").max(120),
  timezone: z.string().max(60).optional(),
  baseCurrency: z.string().max(10).optional(),
  category: tenantCategorySchema.optional(),
});

export const updateTenantSchema = createTenantSchema.partial().extend({
  location: z.string().max(500).optional(),
  totalHa: z.number().nonnegative().optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
