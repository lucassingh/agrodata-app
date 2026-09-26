import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { anthropic, CLAUDE_MODEL } from "./claude-client";

/** Segunda lectura del mensaje para los tipos con datos propios (tambo, pesadas,
 *  reproducción). El schema principal de extracción está en el tope de 16 campos
 *  opcionales de los structured outputs de Claude: en vez de agrandarlo, cada tipo
 *  tiene su schema chico y se pide solo cuando hace falta. */

const n = (description: string) => z.number().nullable().describe(description);

const milkProductionSchema = z.object({
  liters: n("litros producidos en el día (total de los ordeñes)"),
  cowsMilking: n("vacas en ordeño"),
  cowsDry: n("vacas secas, si se mencionan"),
});

const milkSettlementSchema = z.object({
  dairy: z.string().nullable().describe("usina o empresa láctea que liquida"),
  periodStart: z.string().nullable().describe("inicio del período liquidado, YYYY-MM-DD"),
  periodEnd: z.string().nullable().describe("fin del período liquidado, YYYY-MM-DD"),
  liters: n("litros liquidados o entregados"),
  fatPct: n("grasa butirosa en %"),
  proteinPct: n("proteína en %"),
  pricePerLiter: n("precio por litro (el precio final por litro, sin IVA si lo discrimina)"),
  totalAmount: n("importe total a cobrar de la liquidación"),
  currency: z.enum(["ARS", "USD"]).nullable().describe("ARS salvo que diga dólares"),
});

const weighingSchema = z.object({
  groups: z
    .array(
      z.object({
        pasture: z.string().nullable().describe("potrero o corral"),
        animalType: z.string().nullable().describe("categoría de animal (terneros, novillos, vaquillonas...)"),
        headCount: n("cabezas pesadas"),
        averageKg: n("peso promedio por cabeza en kg (si dice el total, dividilo por las cabezas)"),
      }),
    )
    .describe("un grupo por cada combinación de potrero y categoría mencionada"),
});

const reproductionSchema = z.object({
  event: z
    .enum(["SERVICE_START", "PREGNANCY_CHECK", "WEANING"])
    .nullable()
    .describe("SERVICE_START: inicio de servicio o entore; PREGNANCY_CHECK: tacto; WEANING: destete"),
  rodeo: z.string().nullable().describe("rodeo mencionado, si hay"),
  animalType: z.string().nullable().describe("categoría (vacas, vaquillonas...)"),
  females: n("hembras que entran en servicio"),
  pregnant: n("preñadas en el tacto"),
  empty: n("vacías en el tacto"),
  weaned: n("terneros destetados"),
});

const sanitarySchema = z.object({
  nextDose: z
    .string()
    .nullable()
    .describe(
      "fecha de la próxima dosis o refuerzo, YYYY-MM-DD, solo si el mensaje la menciona (resolvé «en 6 meses» o «en 21 días» desde la fecha del tratamiento); si no, null",
    ),
});

const SCHEMAS = {
  SANITARY_TREATMENT: sanitarySchema,
  MILK_PRODUCTION: milkProductionSchema,
  MILK_SETTLEMENT: milkSettlementSchema,
  WEIGHING: weighingSchema,
  REPRODUCTION: reproductionSchema,
} as const;

export type DetailType = keyof typeof SCHEMAS;

export function hasDetail(type: string | null): type is DetailType {
  return type !== null && type in SCHEMAS;
}

/** Devuelve el detalle con `kind`, o null si Claude no pudo leerlo. */
export async function extractEventDetail(input: {
  type: DetailType;
  text?: string;
  image?: { base64: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };
  today: string;
  pastures: string[];
  animalTypes: string[];
}) {
  const content: BetaMessageParam["content"] = [];
  if (input.image) {
    content.push({ type: "image", source: { type: "base64", media_type: input.image.mediaType, data: input.image.base64 } });
  }
  content.push({ type: "text", text: input.text || "Leé los datos de la imagen adjunta." });

  const schema = SCHEMAS[input.type];
  const response = await anthropic.beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: `Extraés datos de un mensaje de un productor agropecuario argentino. Hoy es ${input.today}.
Usá solo lo que dice el mensaje o la imagen; lo que no esté, en null. Nunca inventes números.
Si un potrero o una categoría coincide con uno de estos, devolvelo EXACTAMENTE así:
- Potreros: ${input.pastures.join(", ") || "(ninguno)"}
- Categorías de animales: ${input.animalTypes.join(", ") || "(ninguna)"}`,
    messages: [{ role: "user", content }],
    output_format: betaZodOutputFormat(schema),
  });
  const parsed = response.parsed_output;
  if (!parsed) return null;
  return { kind: input.type, ...parsed };
}
