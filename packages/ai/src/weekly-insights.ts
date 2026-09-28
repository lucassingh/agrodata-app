import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { anthropic, CLAUDE_MODEL } from "./claude-client";

export const weeklyInsightsSchema = z.object({
  insights: z
    .array(z.string())
    .describe("De 0 a 3 conclusiones, una oración cada una, con qué hacer. Lista vacía si no hay nada que valga la pena decir."),
});

const SYSTEM_PROMPT = `Sos el asesor agropecuario de AgroData. Te paso el resumen de la semana de un campo
argentino y sus avisos abiertos. Escribí hasta 3 conclusiones para el productor: qué le
conviene mirar o hacer, en castellano rioplatense, una oración cada una, concretas.

Reglas, sin excepción:
- Usá SOLO los datos que te paso. No supongas nada que no esté escrito.
- No hagas cuentas: no calcules porcentajes, totales, promedios ni diferencias. Cada número
  que escribas tiene que estar tal cual en los datos. Si una conclusión necesita una cuenta,
  no la escribas.
- Nombrá el dato del que sale cada conclusión ("el gasoil alcanza para 6 días…").
- Priorizá lo urgente: avisos vencidos, stock que se acaba, animales que pierden peso.
- Si no hay nada que valga la pena decir, devolvé la lista vacía. Mejor nada que algo obvio.
- Sin saludos ni cierre: solo las conclusiones.`;

/** Conclusiones de la semana a partir de los datos ya calculados. El control de
 *  que no invente números lo hace quien llama (`keepGroundedInsights`). Ante un
 *  error devuelve la lista vacía: el resumen sale igual, sin conclusiones. */
export async function writeWeeklyInsights(input: { fieldName: string; facts: string }): Promise<string[]> {
  try {
    const response = await anthropic.beta.messages.parse({
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Campo: ${input.fieldName}\n\n${input.facts}` }],
      output_format: betaZodOutputFormat(weeklyInsightsSchema),
    });
    return response.parsed_output?.insights ?? [];
  } catch (error) {
    console.error("[weekly-insights] no se pudieron escribir las conclusiones", error);
    return [];
  }
}
