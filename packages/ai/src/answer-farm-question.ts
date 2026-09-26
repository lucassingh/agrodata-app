import "server-only";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { anthropic, CLAUDE_MODEL } from "./claude-client";

const day = z.string().describe("fecha YYYY-MM-DD, inclusive");
const period = { desde: day, hasta: day };

/** Herramientas de solo lectura sobre los datos del campo. Los esquemas viven
 *  acá; la implementación (consultas a la base) la inyecta quien llama. */
export const farmQueryInputs = {
  stock_actual: z.object({
    insumo: z.string().nullable().describe("parte del nombre del insumo; null para todos"),
  }),
  movimientos_stock: z.object({
    ...period,
    insumo: z.string().nullable().describe("parte del nombre del insumo; null para todos"),
  }),
  gastos: z.object({
    ...period,
    categoria: z.string().nullable().describe("parte del nombre de la categoría; null para todas"),
  }),
  hacienda_actual: z.object({}),
  movimientos_hacienda: z.object(period),
  potreros: z.object({}),
  tareas: z.object(period),
  economia: z.object({
    ciclo: z.string().nullable().describe("ciclo agrícola, ej. \"26/27\" (julio a junio); null para todos"),
    cultivo: z.string().nullable().describe("parte del nombre del cultivo; null para todos"),
    lote: z.string().nullable().describe("parte del nombre del lote; null para todos"),
  }),
  registros: z.object({
    ...period,
    texto: z.string().nullable().describe("palabra a buscar en el registro o el mensaje original; null para todos"),
  }),
};

export type FarmQueryTool = keyof typeof farmQueryInputs;
export type FarmQueryHandlers = {
  [K in FarmQueryTool]: (input: z.infer<(typeof farmQueryInputs)[K]>) => Promise<unknown>;
};

const DESCRIPTIONS: Record<FarmQueryTool, string> = {
  stock_actual: "Stock actual de los insumos (cantidad, unidad y costo unitario vigente).",
  movimientos_stock:
    "Ingresos y consumos de insumos en un período: totales por insumo (con el costo de lo consumido) y el detalle.",
  gastos: "Gastos cargados en un período: totales por moneda y por categoría, y el detalle. Pesos y dólares nunca se suman.",
  hacienda_actual: "Animales que hay hoy en cada potrero, por tipo.",
  movimientos_hacienda:
    "Nacimientos, compras, ventas, mortandad, traslados y ajustes de hacienda en un período, con kilos y montos si los hay.",
  potreros: "Potreros con hectáreas, cultivos, animales y días de descanso.",
  tareas: "Tareas (sanidad, siembra, pulverización, fertilización) con fecha en un período.",
  economia:
    "Economía por lote: cada campaña (cultivo × lote × ciclo) con costos directos, costo por ha, rinde, ingresos, margen bruto y margen por ha en dólares, y el rinde de indiferencia. Úsala para preguntas de costos, márgenes, rindes o qué lote dejó más.",
  registros:
    "Historial de todo lo que se cargó (por WhatsApp o la web) en un período, con el mensaje original. Sirve para lo que no está en los otros módulos.",
};

const SYSTEM_PROMPT = `Sos el asistente de AgroData por WhatsApp. Un productor agropecuario argentino te hace una
pregunta sobre su campo. Respondé usando SOLO los datos que devuelven las herramientas.

Reglas:
- Todo número de tu respuesta sale de una herramienta. Nunca estimes ni inventes.
- Si no hay datos para responder, decilo claro. Solo sugerí cargar cosas que AgroData registra
  hoy (gastos, compras, stock de insumos, siembras, animales y sus movimientos, pulverizaciones,
  fertilizaciones y sanidad); no prometas funciones que no existen (por ejemplo, lluvias).
- Si la pregunta no dice el período, usá el que tenga sentido ("este mes" por defecto para
  gastos y consumos) y decí cuál usaste.
- Pesos y dólares van por separado; nunca los sumes. En economía por lote los resultados ya vienen
  en dólares (convertidos con el dólar que eligió el campo): usalos así.
- Si un ingreso es estimado (precio de referencia, sin ventas), decilo.
- Respondé corto, en castellano rioplatense, como un mensaje de WhatsApp: una o dos frases y,
  si hace falta, una lista breve. Resaltá los números clave con *asteriscos* (formato de
  WhatsApp). Nada de encabezados ni tablas.`;

/** Responde una pregunta del productor con herramientas de solo lectura sobre sus datos. */
export async function answerFarmQuestion(input: {
  question: string;
  today: string;
  handlers: FarmQueryHandlers;
}): Promise<string> {
  const tools = (Object.keys(farmQueryInputs) as FarmQueryTool[]).map((name) =>
    betaZodTool({
      name,
      description: DESCRIPTIONS[name],
      inputSchema: farmQueryInputs[name],
      run: async (args) => JSON.stringify(await input.handlers[name](args as never)),
    }),
  );

  const finalMessage = await anthropic.beta.messages.toolRunner({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: `${SYSTEM_PROMPT}\n\nHoy es ${input.today}.`,
    messages: [{ role: "user", content: input.question }],
    tools,
    max_iterations: 8,
  });

  const text = finalMessage.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
  return text || "No pude armar una respuesta con los datos que hay. ¿Podés preguntarlo de otra forma?";
}
