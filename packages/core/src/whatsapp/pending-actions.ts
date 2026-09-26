import { z } from "zod";

/** Cuánto vive una acción pendiente antes de descartarse sola. */
export const PENDING_ACTION_TTL_MS = 24 * 60 * 60 * 1000;

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export const farmEventSchema = z.object({
  type: z.string(),
  summary: z.string(),
  occurredAt: nullableString,
  potrero: nullableString,
  destinoPotrero: nullableString,
  cultivo: nullableString,
  hectareas: nullableNumber,
  cantidad: nullableNumber,
  unidad: nullableString,
  item: nullableString,
  producto: nullableString,
  movimientoStock: z.enum(["INGRESO", "EGRESO", "NINGUNO"]),
  // default: acciones guardadas antes de que existiera el campo siguen siendo válidas.
  kilos: nullableNumber.default(null),
  monto: nullableNumber,
  moneda: z.enum(["ARS", "USD"]).nullable(),
  contraparte: nullableString,
  dosis: nullableString,
  categoria: nullableString,
  // Datos propios del tipo (tambo, pesadas, reproducción); se validan en el planificador.
  detail: z.any().nullable().default(null),
});

/** Payload de cada tipo de acción pendiente. Se valida al leerlo de la base
 *  (es JSON libre en Prisma), nunca se confía en su forma a ciegas.
 *
 *  APPLY_MESSAGE_PLAN: el mensaje necesitaba crear entidades (categoría,
 *  insumo, potrero...). Se guarda el evento y no el plan: al confirmar se vuelve
 *  a planificar contra el catálogo de ese momento, por si algo cambió. */
export const pendingActionSchema = z.discriminatedUnion("actionType", [
  z.object({
    actionType: z.literal("APPLY_MESSAGE_PLAN"),
    payload: z.object({
      recordId: z.string().min(1),
      event: farmEventSchema,
    }),
  }),
]);

export type PendingAction = z.infer<typeof pendingActionSchema>;

export function isPendingActionExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
