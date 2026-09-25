import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { anthropic, CLAUDE_MODEL } from "./claude-client";
import { extractedEventSchema, type ExtractedEvent } from "./extraction.schema";

const TYPE_GUIDE = `
- SEEDING (siembra): sembrar o plantar un cultivo en un potrero.
- ANIMAL_BIRTH (nacimiento): parió un animal, nació una cría.
- POTRERO_CHANGE (cambio de potrero): mover hacienda de un potrero a otro.
- PURCHASE (compra): comprar insumos, animales, maquinaria u otro bien.
- SALE (venta): vender animales, cosecha u otro bien.
- FUMIGATION (pulverización): aplicar un fitosanitario (herbicida, insecticida, fungicida) en un potrero.
- FERTILIZATION (fertilización): aplicar fertilizante en un potrero.
- SANITARY_TREATMENT (sanidad): vacunar, desparasitar o tratar animales.
- FUEL_USAGE (combustible): carga de gasoil, nafta u otro combustible.
- EXPENSE_INVOICE (factura/gasto): una foto de factura, o un gasto que no encaja en los tipos anteriores.
`.trim();

function buildSystemPrompt(todayInArgentina: string): string {
  return `Sos el asistente de AgroData que interpreta mensajes de WhatsApp de productores
agropecuarios argentinos y los convierte en registros estructurados del campo.

Hoy es ${todayInArgentina} (huso horario de Argentina). Usalo para resolver fechas
relativas como "ayer" o "el lunes pasado" a una fecha ISO concreta (YYYY-MM-DD).

Tipos de evento posibles:
${TYPE_GUIDE}

Reglas:
1. Si el mensaje describe con claridad uno de estos eventos y tenés los datos mínimos
   para registrarlo, marcá recognized=true, elegí el type correcto, y completá summary
   (una oración corta en español, neutra) y los demás campos que puedas inferir. Los
   campos que no apliquen o no se mencionen quedan en null.
2. Si el mensaje es un saludo, una pregunta, algo ajeno al campo, o le falta un dato
   imprescindible para que el registro tenga sentido (ej. "compré algo" sin decir qué
   ni cuánto costó), marcá recognized=false y escribí en clarificationQuestion UNA
   pregunta breve y concreta en español para pedir esa aclaración por WhatsApp. En ese
   caso type es null y summary es cadena vacía.
3. Si no se menciona ni se deduce una fecha, dejá occurredAt en null.
4. Si hay un monto y no se aclara la moneda, asumí ARS.
5. Si la entrada es una imagen de una factura, es casi siempre EXPENSE_INVOICE (o PURCHASE
   si detalla insumos comprados): extraé proveedor en "contraparte", monto, moneda y fecha
   si son legibles.
6. Nunca inventes datos que no estén en el mensaje o la imagen.
7. "item" es SIEMPRE la categoría de animal; "producto" es SIEMPRE el insumo (semilla,
   combustible, fitosanitario, fertilizante, vacuna). No los mezcles.
8. Stock (movimientoStock + producto + cantidad + unidad):
   - Compra o recepción de insumos con cantidad → INGRESO.
   - Carga de combustible desde el tanque propio del campo, o uso de un insumo que se
     tenía guardado → EGRESO. Si el combustible se cargó y pagó en una estación de
     servicio, no sale del stock propio → NINGUNO.
   - En pulverización o fertilización, si podés calcular el total de producto usado
     (dosis por hectárea × hectáreas) → EGRESO con esa cantidad total y su unidad.
   - En sanidad, "cantidad" son las cabezas tratadas; si el producto se mide en dosis y
     se usó una por animal → EGRESO (la cantidad de dosis es la misma).
   - En siembra, solo hay EGRESO si el mensaje dice cuánta semilla se usó.
   - Compras de animales, maquinaria o servicios → NINGUNO.`;
}

/** Datos reales del campo del productor, para que Claude elija entidades que
 *  ya existen en vez de inventar nombres. */
export interface ExtractionContext {
  expenseCategories: string[];
  supplies: { name: string; unit: string | null }[];
  pastures: string[];
  animalTypes: string[];
}

const EMPTY_CONTEXT: ExtractionContext = { expenseCategories: [], supplies: [], pastures: [], animalTypes: [] };

function quoteList(names: string[]): string {
  return names.length > 0 ? names.map((name) => `"${name}"`).join(", ") : "(ninguno todavía)";
}

/** Catálogo del campo. Los nombres elegidos se buscan después con coincidencia
 *  exacta normalizada, así que tienen que venir tal cual están en la lista. */
function buildCatalogRules(context: ExtractionContext): string {
  const supplies = context.supplies.map((supply) => (supply.unit ? `${supply.name} (${supply.unit})` : supply.name));
  return `

Lo que ya existe en este campo. Si algo del mensaje corresponde a uno de estos, devolvé
EXACTAMENTE ese nombre, copiado tal cual (aunque el mensaje lo diga distinto, ej. "el
norte" → "Potrero Norte", "gasoil" → "Gasoil"). Si no corresponde a ninguno, usá un
nombre nuevo corto y claro.
- Potreros: ${quoteList(context.pastures)}
- Categorías de animales: ${quoteList(context.animalTypes)}
- Insumos (con su unidad): ${quoteList(supplies)}
- Categorías de gasto: ${quoteList(context.expenseCategories)}

9. Si el insumo ya existe, expresá "cantidad" en SU unidad cuando la conversión sea
   obvia (ej. 2 toneladas → 2000 kg); si no se puede convertir, dejá la unidad del mensaje.
10. "categoria" es el rubro: NUNCA null si hay monto en una compra/combustible/factura o
    si entra un insumo nuevo al stock. Elegí una categoría de gasto de la lista si encaja
    con lo comprado; si ninguna encaja, proponé un rubro corto y genérico (ej.
    "Combustible", "Semillas", "Sanidad", "Fertilizantes"), no el nombre del producto.`;
}

export interface ExtractFarmEventInput {
  text?: string;
  image?: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };
  context?: ExtractionContext;
}

const FALLBACK_CLARIFICATION: ExtractedEvent = {
  recognized: false,
  clarificationQuestion: "No pude entender bien tu mensaje. ¿Podés contarme de nuevo qué pasó, con más detalle?",
  type: null,
  summary: "",
  occurredAt: null,
  potrero: null,
  destinoPotrero: null,
  cultivo: null,
  hectareas: null,
  cantidad: null,
  unidad: null,
  item: null,
  producto: null,
  movimientoStock: "NINGUNO",
  monto: null,
  moneda: null,
  contraparte: null,
  dosis: null,
  categoria: null,
};

/** Extrae un evento estructurado de un mensaje de WhatsApp (texto y/o imagen de
 *  factura) usando structured outputs de Claude (`beta.messages.parse` +
 *  `betaZodOutputFormat`) -- un solo schema Zod define tanto el formato
 *  pedido a Claude como la validación del resultado, no hay dos fuentes de
 *  verdad. Si el parseo falla (`parsed_output` null), se devuelve un pedido de
 *  aclaración genérico en vez de tirar una excepción -- nunca se persiste un
 *  evento sin pasar por este schema. */
export async function extractFarmEvent(input: ExtractFarmEventInput): Promise<ExtractedEvent> {
  if (!input.text && !input.image) {
    throw new Error("extractFarmEvent necesita texto o imagen");
  }

  const content: BetaMessageParam["content"] = [];
  if (input.image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: input.image.mediaType, data: input.image.base64 },
    });
  }
  content.push({ type: "text", text: input.text ?? "Extraé los datos de la imagen adjunta." });

  const todayInArgentina = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  const response = await anthropic.beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 8000,
    system: buildSystemPrompt(todayInArgentina) + buildCatalogRules(input.context ?? EMPTY_CONTEXT),
    messages: [{ role: "user", content }],
    output_format: betaZodOutputFormat(extractedEventSchema),
  });

  return response.parsed_output ?? FALLBACK_CLARIFICATION;
}

/** Convierte un `ExtractedEvent` reconocido al JSON que va en `Record.data`.
 *  Descarta los campos de "metadata" de la extracción (`recognized`,
 *  `clarificationQuestion`, `type`, `occurredAt` -- estos dos últimos mapean
 *  a columnas propias de `Record`, no van dentro de `data`), los campos vacíos
 *  y un `movimientoStock` sin movimiento, para no ensuciar el JSON guardado.
 *  Siempre incluye `summary`, porque `formatRecordDescription` del módulo
 *  Datos lo usa como primera prioridad para armar la descripción de la fila. */
export function toRecordPayload(event: ExtractedEvent): Record<string, unknown> {
  const { recognized: _recognized, clarificationQuestion: _clarificationQuestion, type: _type, occurredAt: _occurredAt, ...rest } = event;
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value === null || value === "") continue;
    if (key === "movimientoStock" && value === "NINGUNO") continue;
    data[key] = value;
  }
  return data;
}
