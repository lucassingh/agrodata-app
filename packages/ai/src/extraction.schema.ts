import { z } from "zod";

/** Los tipos de evento que un mensaje de WhatsApp puede generar. Se excluye
 *  a propósito `TASK_COMPLETED` del enum `RecordType` de Prisma -- ese valor
 *  solo lo produce el botón "Agregar Dato" del módulo Tareas del dashboard,
 *  nunca un mensaje de WhatsApp (igual que en el legacy). */
export const EXTRACTABLE_RECORD_TYPES = [
  "SEEDING",
  "ANIMAL_BIRTH",
  "ANIMAL_DEATH",
  "POTRERO_CHANGE",
  "PURCHASE",
  "SALE",
  "FUMIGATION",
  "FERTILIZATION",
  "SANITARY_TREATMENT",
  "FUEL_USAGE",
  "EXPENSE_INVOICE",
  "HARVEST",
] as const;

/** Lo que puede ser un mensaje: un evento a registrar o una consulta sobre lo ya
 *  cargado. QUERY no es un RecordType: una consulta se responde, no se guarda. */
export const MESSAGE_TYPES = [...EXTRACTABLE_RECORD_TYPES, "QUERY"] as const;

export const STOCK_MOVEMENTS = ["INGRESO", "EGRESO", "NINGUNO"] as const;

/** Schema plano (sin unión discriminada) a propósito: es el shape documentado
 *  y soportado por `zodOutputFormat` para structured outputs de Claude.
 *
 *  LÍMITE DURO: la API de Claude rechaza (HTTP 400, "Schemas contains too many
 *  parameters with union types") cualquier schema con más de 16 campos
 *  nullable/union. Hoy hay 16: ESTÁ EN EL LÍMITE. Por eso `clarificationQuestion` y `summary` son
 *  strings no-nullable (vacíos cuando no aplican) y los campos de dominio son
 *  genéricos y se reusan según el tipo de evento. Para sumar otro campo hay
 *  que reestructurar (ej. agrupar campos opcionales en un objeto o pasar alguno a
 *  no-nullable con valor vacío). */
export const extractedEventSchema = z.object({
  recognized: z
    .boolean()
    .describe(
      "true si el mensaje describe con claridad un evento del campo y hay datos suficientes para registrarlo; false si es ambiguo, irrelevante, o falta un dato clave imprescindible",
    ),
  clarificationQuestion: z
    .string()
    .describe(
      "si recognized=false, UNA pregunta breve y concreta en español para pedirle la aclaración al usuario por WhatsApp. Cadena vacía si recognized=true",
    ),
  type: z.enum(MESSAGE_TYPES).nullable().describe("null si recognized=false"),
  summary: z
    .string()
    .describe(
      "resumen corto en español, en tono neutro, ej: 'Siembra de soja en potrero Norte' o 'Compra de 500 L de gasoil'. Cadena vacía si recognized=false",
    ),
  occurredAt: z
    .string()
    .nullable()
    .describe("fecha ISO 8601 (YYYY-MM-DD) si el usuario la menciona (o se deduce, ej. 'ayer'); si no, null"),
  potrero: z
    .string()
    .nullable()
    .describe("nombre del potrero o lote mencionado. En POTRERO_CHANGE es el de ORIGEN"),
  destinoPotrero: z.string().nullable().describe("solo en POTRERO_CHANGE: potrero de destino"),
  cultivo: z.string().nullable().describe("cultivo sembrado o sobre el que se aplicó algo"),
  hectareas: z.number().nullable().describe("superficie sembrada, pulverizada o fertilizada"),
  cantidad: z
    .number()
    .nullable()
    .describe(
      "cantidad numérica. En eventos con animales (nacimiento, mortandad, cambio de potrero, sanidad, compra o venta de hacienda): cabezas. En los demás: cantidad del producto (litros, bolsas, kg...)",
    ),
  unidad: z
    .string()
    .nullable()
    .describe("unidad de 'cantidad' cuando es un producto: 'L', 'kg', 'bolsas', 'dosis', 'unidades'..."),
  item: z
    .string()
    .nullable()
    .describe(
      "categoría de animal involucrada (ternero, novillo, vaquillona...) en nacimientos, mortandad, cambios de potrero, sanidad, y compras o ventas de hacienda. null si la compra o venta no es de animales",
    ),
  producto: z
    .string()
    .nullable()
    .describe(
      "insumo involucrado: lo que se compró (semilla, gasoil, vacuna, fertilizante...), el combustible cargado, el producto pulverizado o aplicado, la vacuna o tratamiento sanitario",
    ),
  movimientoStock: z
    .enum(STOCK_MOVEMENTS)
    .describe(
      "INGRESO si entra un insumo al stock del campo (compra o recepción de insumos); EGRESO si se usa o consume un insumo del stock propio; NINGUNO si no hay movimiento de stock",
    ),
  kilos: z
    .number()
    .nullable()
    .describe("kilos totales de hacienda vendida o comprada (si se da el promedio por cabeza, multiplicalo por la cantidad)"),
  monto: z.number().nullable(),
  moneda: z.enum(["ARS", "USD"]).nullable().describe("ARS por defecto si hay monto y el usuario no aclara"),
  contraparte: z.string().nullable().describe("proveedor en una compra o factura, o comprador en una venta"),
  dosis: z.string().nullable().describe("dosis o tasa de aplicación, ej. '2 L/ha' o '5 ml por animal'"),
  categoria: z
    .string()
    .nullable()
    .describe("rubro del gasto o del insumo (ej. Combustible, Semillas, Sanidad, Fertilizantes)"),
});

export type ExtractedEvent = z.infer<typeof extractedEventSchema>;
