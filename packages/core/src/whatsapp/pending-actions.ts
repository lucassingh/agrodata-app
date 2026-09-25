import { z } from "zod";

/** Cuánto vive una acción pendiente antes de descartarse sola. */
export const PENDING_ACTION_TTL_MS = 24 * 60 * 60 * 1000;

const expenseEventDataSchema = z.object({
  type: z.string(),
  summary: z.string(),
  occurredAt: z.string().nullable(),
  monto: z.number().nullable(),
  moneda: z.enum(["ARS", "USD"]).nullable(),
  contraparte: z.string().nullable(),
  categoria: z.string().nullable(),
});

/** Payload de cada tipo de acción pendiente. Se valida al leerlo de la base
 *  (es JSON libre en Prisma), nunca se confía en su forma a ciegas. Cada etapa
 *  de la Slice C suma su propio tipo acá. */
export const pendingActionSchema = z.discriminatedUnion("actionType", [
  z.object({
    actionType: z.literal("CREATE_EXPENSE_WITH_NEW_CATEGORY"),
    payload: z.object({
      categoryName: z.string().trim().min(1).max(100),
      expense: expenseEventDataSchema,
    }),
  }),
]);

export type PendingAction = z.infer<typeof pendingActionSchema>;

export function isPendingActionExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
