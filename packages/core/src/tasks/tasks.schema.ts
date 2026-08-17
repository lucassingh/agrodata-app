import { z } from "zod";

const TASK_TYPES = [
  "TRATAMIENTO_SANITARIO",
  "ORDEN_SIEMBRA",
  "PULVERIZACION",
  "FERTILIZACION",
] as const;

export const taskProductSchema = z.object({
  productName: z.string().trim().min(1),
  dosis: z.string().trim().optional(),
  unit: z.string().trim().optional(),
});

export const taskPastureSchema = z.object({
  pastureId: z.string().min(1),
  hectares: z.string().trim().optional(),
});

export const taskAnimalSchema = z.object({
  quantity: z.number().positive(),
  animalType: z.string().trim().min(1),
});

export const taskFertilizerSchema = z.object({
  source: z.string().trim().min(1),
  dosis: z.string().trim().optional(),
  unit: z.string().trim().optional(),
});

export const createTaskSchema = z.object({
  type: z.enum(TASK_TYPES),
  deadline: z.string().min(1, "Indicá la fecha límite"),
  treatment: z.string().trim().max(200).optional(),
  crop: z.string().trim().optional(),
  genetic: z.string().trim().optional(),
  spacing: z.string().trim().optional(),
  density: z.string().trim().optional(),
  densityUnit: z.enum(["mts2", "has"]).optional(),
  contractor: z.string().trim().optional(),
  description: z.string().trim().max(2000).optional(),
  responsibleId: z.string().optional(),
  products: z.array(taskProductSchema).optional(),
  pastures: z.array(taskPastureSchema).optional(),
  animals: z.array(taskAnimalSchema).optional(),
  fertilizers: z.array(taskFertilizerSchema).optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema
  .omit({ type: true })
  .partial()
  .extend({
    status: z.enum(["PENDING", "COMPLETED"]).optional(),
  });
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
