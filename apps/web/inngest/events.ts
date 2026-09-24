import { eventType } from "inngest";
import { z } from "zod";
import { whatsappMessageTypeSchema } from "@repo/core";

/** Payload del evento interno que dispara el procesamiento async de un
 *  mensaje de WhatsApp. `messageType` reusa el enum real del webhook
 *  (`@repo/core`) en vez de redeclarar los mismos valores acá -- una sola
 *  fuente de verdad para los tipos de mensaje que WhatsApp puede mandar. */
export const whatsappMessageReceivedSchema = z.object({
  webhookEventId: z.string(),
  waId: z.string(),
  messageType: whatsappMessageTypeSchema,
  textBody: z.string().optional(),
  mediaId: z.string().optional(),
  mediaMimeType: z.string().optional(),
});

/** `EventType` de Inngest v4: reemplaza al `EventSchemas().fromRecord()` de
 *  versiones anteriores (no existe en `inngest@4`). Esta misma instancia se
 *  usa como trigger tipado en `createFunction` y para construir el evento
 *  validado que se manda con `inngest.send()` -- una sola definición para
 *  ambos lados. */
export const whatsappMessageReceived = eventType("whatsapp/message.received", {
  schema: whatsappMessageReceivedSchema,
});
