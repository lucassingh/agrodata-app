import { z } from "zod";

/** El legacy no impone tope en el backend (solo en el frontend, MAX=5) --
 *  acá sí lo validamos server-side como red de seguridad extra, sin cambiar
 *  el comportamiento del camino feliz (la UI ya deshabilita "Agregar" al
 *  llegar a 5). */
const MAX_SUB_ENTITIES = 5;

export const pastureCropSchema = z.object({
  crop: z.string().trim().min(1).max(100),
  hectares: z.number().nonnegative().optional(),
  startDate: z.string().optional(),
});

export const pastureAnimalSchema = z.object({
  quantity: z.number().positive(),
  animalType: z.string().trim().min(1).max(100),
  averageWeight: z.number().nonnegative().optional(),
});

export const createPastureSchema = z.object({
  name: z.string().trim().min(1, "Ingresá el nombre del potrero").max(120),
  hectares: z.number().nonnegative().optional(),
  crops: z.array(pastureCropSchema).max(MAX_SUB_ENTITIES).optional(),
  animals: z.array(pastureAnimalSchema).max(MAX_SUB_ENTITIES).optional(),
});
export type CreatePastureInput = z.infer<typeof createPastureSchema>;

export const updatePastureSchema = createPastureSchema.partial();
export type UpdatePastureInput = z.infer<typeof updatePastureSchema>;
