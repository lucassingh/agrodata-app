import { z } from "zod";

/** Los 8 tipos de evento que un mensaje de WhatsApp puede generar. Se excluye
 *  a propósito `TASK_COMPLETED` del enum `RecordType` de Prisma -- ese valor
 *  solo lo produce el botón "Agregar Dato" del módulo Tareas del dashboard,
 *  nunca un mensaje de WhatsApp (igual que en el legacy). */
export const EXTRACTABLE_RECORD_TYPES = [
  "SEEDING",
  "ANIMAL_BIRTH",
  "POTRERO_CHANGE",
  "PURCHASE",
  "SALE",
  "FUMIGATION",
  "FUEL_USAGE",
  "EXPENSE_INVOICE",
] as const;

/** Schema plano (sin unión discriminada) a propósito: es el shape documentado
 *  y soportado por `zodOutputFormat` para structured outputs de Claude. Todo
 *  campo que no sea siempre requerido usa `.nullable()`, no `.optional()` --
 *  los structured outputs generan JSON Schema estricto (`required` con todas
 *  las claves), así que "ausente" se modela con `null`, nunca con la key
 *  faltante. `recognized`+`clarificationQuestion` reemplazan lo que hubiera
 *  sido una unión "evento reconocido | necesita aclaración".
 *
 *  Los campos de dominio (`item`, `cantidad`, `potrero`, `contraparte`) son
 *  deliberadamente genéricos y se reusan según el `type` del evento -- la API
 *  de Claude rechaza (HTTP 400) cualquier schema con más de 16 parámetros
 *  nullable/union ("Schemas contains too many parameters with union types"),
 *  y un campo dedicado por cada variante posible (`animalType`, `proveedor`,
 *  `comprador`, `producto`, `litros`, `vehiculo`, `origenPotrero`...) superaba
 *  ese límite (21). Cada campo genérico documenta en su `.describe()` qué
 *  significa según el tipo de evento. */
export const extractedEventSchema = z.object({
  recognized: z
    .boolean()
    .describe(
      "true si el mensaje describe con claridad un evento del campo y hay datos suficientes para registrarlo; false si es ambiguo, irrelevante, o falta un dato clave imprescindible",
    ),
  clarificationQuestion: z
    .string()
    .nullable()
    .describe(
      "si recognized=false, UNA pregunta breve y concreta en español para pedirle la aclaración al usuario por WhatsApp. null si recognized=true",
    ),
  type: z
    .enum(EXTRACTABLE_RECORD_TYPES)
    .nullable()
    .describe("null si recognized=false"),
  summary: z
    .string()
    .nullable()
    .describe(
      "resumen corto en español, en tono neutro, ej: 'Siembra de soja en potrero Norte' o 'Compra de 500L de gasoil'. null si recognized=false",
    ),
  occurredAt: z
    .string()
    .nullable()
    .describe("fecha ISO 8601 (YYYY-MM-DD) si el usuario la menciona explícitamente, si no null"),
  potrero: z
    .string()
    .nullable()
    .describe(
      "nombre del potrero mencionado. En POTRERO_CHANGE es el potrero de ORIGEN (el destino va en destinoPotrero)",
    ),
  destinoPotrero: z.string().nullable().describe("solo en POTRERO_CHANGE: potrero de destino"),
  cultivo: z.string().nullable(),
  hectareas: z.number().nullable(),
  cantidad: z
    .number()
    .nullable()
    .describe(
      "cantidad numérica según el contexto: cabezas de animales, litros de combustible, unidades compradas/vendidas, etc.",
    ),
  item: z
    .string()
    .nullable()
    .describe(
      "el 'qué' del evento según el tipo: categoría de animal nacido (ANIMAL_BIRTH), qué se compró/vendió (PURCHASE/SALE), producto fitosanitario aplicado (FUMIGATION), o vehículo cargado (FUEL_USAGE)",
    ),
  monto: z.number().nullable(),
  moneda: z.enum(["ARS", "USD"]).nullable().describe("ARS por defecto si el usuario no aclara"),
  contraparte: z
    .string()
    .nullable()
    .describe("proveedor en una compra/factura, o comprador en una venta"),
  dosis: z.string().nullable().describe("dosis o tasa de aplicación en una fumigación, ej. '2L/ha'"),
  categoria: z.string().nullable().describe("categoría del gasto, si se puede inferir"),
});

export type ExtractedEvent = z.infer<typeof extractedEventSchema>;
