import "server-only";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { anthropic, CLAUDE_MODEL } from "./claude-client";

export const pendingReplySchema = z.object({
  intent: z
    .enum(["confirm", "reject", "unrelated"])
    .describe(
      "confirm: acepta lo que se le preguntó; reject: lo rechaza o dice que no lo cargue; unrelated: el mensaje no contesta la pregunta (habla de otra cosa)",
    ),
});

export type PendingReplyIntent = z.infer<typeof pendingReplySchema>["intent"];

const SYSTEM_PROMPT = `Sos el asistente de AgroData por WhatsApp. Le hiciste una pregunta de sí o no a un
productor agropecuario argentino y te respondió. Decidí si la respuesta confirma, rechaza
o no tiene que ver con la pregunta.

- Respuestas como "sí", "dale", "ok", "de una", "cargalo", "👍" confirman.
- Respuestas como "no", "dejá", "cancelá", "no lo cargues" rechazan.
- Si el mensaje cuenta otra cosa (otro evento del campo, otra pregunta), es unrelated,
  aunque incluya la palabra "sí" o "no" de pasada.
- Si la respuesta corrige un dato ("no, era Semillas"), es reject: no se carga lo propuesto.`;

/** Interpreta la respuesta del productor a una acción pendiente. Ante cualquier
 *  duda (parseo fallido) devuelve "unrelated": nunca se confirma algo por error. */
export async function interpretPendingReply(input: { question: string; reply: string }): Promise<PendingReplyIntent> {
  const response = await anthropic.beta.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Pregunta que le hiciste:\n${input.question}\n\nRespuesta del productor:\n${input.reply}`,
      },
    ],
    output_format: betaZodOutputFormat(pendingReplySchema),
  });

  return response.parsed_output?.intent ?? "unrelated";
}
