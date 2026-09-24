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
- FUMIGATION (fumigación/pulverización): aplicar un producto fitosanitario en un potrero.
- FUEL_USAGE (uso de combustible): carga de gasoil, nafta u otro combustible.
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
   caso type y summary quedan en null.
3. Si no se menciona una fecha explícita, dejá occurredAt en null.
4. Si no se aclara la moneda de un monto, asumí ARS.
5. Si la entrada es una imagen de una factura, es casi siempre EXPENSE_INVOICE: extraé
   el proveedor en "contraparte", monto, moneda y fecha si son legibles.
6. Nunca inventes datos que no estén en el mensaje o la imagen.
7. Los campos "item", "cantidad", "potrero" y "contraparte" son genéricos y su
   significado depende del tipo de evento -- seguí exactamente la descripción de
   cada campo en el schema (por ejemplo, "item" es la categoría del animal en un
   nacimiento, pero el producto fitosanitario en una fumigación).`;
}

export interface ExtractFarmEventInput {
  text?: string;
  image?: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };
}

const FALLBACK_CLARIFICATION: ExtractedEvent = {
  recognized: false,
  clarificationQuestion: "No pude entender bien tu mensaje. ¿Podés contarme de nuevo qué pasó, con más detalle?",
  type: null,
  summary: null,
  occurredAt: null,
  potrero: null,
  destinoPotrero: null,
  cultivo: null,
  hectareas: null,
  cantidad: null,
  item: null,
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
    system: buildSystemPrompt(todayInArgentina),
    messages: [{ role: "user", content }],
    output_format: betaZodOutputFormat(extractedEventSchema),
  });

  return response.parsed_output ?? FALLBACK_CLARIFICATION;
}

/** Convierte un `ExtractedEvent` reconocido al JSON que va en `Record.data`.
 *  Descarta los campos de "metadata" de la extracción (`recognized`,
 *  `clarificationQuestion`, `type`, `occurredAt` -- estos dos últimos mapean
 *  a columnas propias de `Record`, no van dentro de `data`) y los campos en
 *  `null` para no ensuciar el JSON guardado, igual que el resto de los
 *  módulos que escriben Records (Insumos, Tareas). Siempre incluye
 *  `summary`, porque `formatRecordDescription` del módulo Datos lo usa como
 *  primera prioridad para armar la descripción de la fila. */
export function toRecordPayload(event: ExtractedEvent): Record<string, unknown> {
  const { recognized: _recognized, clarificationQuestion: _clarificationQuestion, type: _type, occurredAt: _occurredAt, ...rest } = event;
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== null) data[key] = value;
  }
  return data;
}
