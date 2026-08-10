import { z } from "zod";
import { RecordType } from "@repo/database";

export const createRecordSchema = z.object({
  type: z.nativeEnum(RecordType),
  occurredAt: z.string(),
  data: z.record(z.string(), z.unknown()),
  source: z.string().default("plataforma"),
  userId: z.string().optional(),
});
export type CreateRecordInput = z.infer<typeof createRecordSchema>;
