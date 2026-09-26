import { z } from "zod";
import { EXCHANGE_RATE_KINDS } from "../economy/exchange-rates";
import { FARM_ACTIVITIES } from "./tenant-labels";

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
  activities: z.array(z.enum(FARM_ACTIVITIES)).min(1, "Elegí al menos una actividad").optional(),
});

export const updateTenantSchema = createTenantSchema.partial().extend({
  location: z.string().max(500).optional(),
  totalHa: z.number().nonnegative().optional(),
  exchangeRateKind: z.enum(EXCHANGE_RATE_KINDS).optional(),
  vatCondition: z.enum(["RESPONSABLE_INSCRIPTO", "MONOTRIBUTISTA"]).optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
