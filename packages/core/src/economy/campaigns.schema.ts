import { z } from "zod";

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");

export const createCampaignSchema = z.object({
  pastureId: z.string().min(1, "Elegí un lote"),
  crop: z.string().trim().min(1, "Ingresá el cultivo").max(100),
  hectares: z.number().positive("Las hectáreas tienen que ser mayores a 0").optional(),
  sowingDate: isoDay.optional(),
  referencePrice: z.number().positive("El precio tiene que ser mayor a 0").optional(),
  notes: z.string().trim().max(500).optional(),
});
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = createCampaignSchema.omit({ pastureId: true }).partial().extend({
  status: z.enum(["IN_PROGRESS", "HARVESTED", "CLOSED"]).optional(),
  referencePrice: z.number().positive("El precio tiene que ser mayor a 0").nullable().optional(),
});
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
