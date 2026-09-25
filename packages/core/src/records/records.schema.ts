import { z } from "zod";
import { RecordType } from "@repo/database";

export const createRecordSchema = z.object({
  type: z.nativeEnum(RecordType),
  occurredAt: z.string(),
  data: z.record(z.string(), z.unknown()),
  source: z.string().default("plataforma"),
  userId: z.string().optional(),
  /** Texto original del mensaje (o la transcripción del audio), cuando viene de WhatsApp. */
  rawMessage: z.string().max(4000).optional(),
});
export type CreateRecordInput = z.infer<typeof createRecordSchema>;

/** Corrección de un registro desde Datos: la fecha y la descripción. El resto
 *  de lo extraído es informativo; lo que el mensaje cargó en Gastos, Insumos,
 *  Potreros o Tareas se corrige en cada módulo. */
export const updateRecordSchema = z.object({
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí una fecha válida"),
  summary: z.string().trim().min(1, "Escribí una descripción").max(300),
});
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
