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
// Con el prefijo de la app: dos apps en el mismo entorno de Inngest con el mismo
// nombre de evento dispararían las funciones de las dos.
export const whatsappMessageReceived = eventType("agrodata/whatsapp.message-received", {
  schema: whatsappMessageReceivedSchema,
});

/** Dispara los avisos del día a mano (el disparo normal es el cron de lunes a sábado). */
export const alertsRequested = eventType("agrodata/alerts.requested", {
  schema: z.object({}),
});

/** Dispara el resumen semanal a mano (el disparo normal es el cron de los lunes). */
export const weeklySummaryRequested = eventType("agrodata/weekly-summary.requested", {
  schema: z.object({}),
});

/** Copia a Clerk a quienes ya tenían cuenta (migración del login). Se dispara a mano, una vez por
 *  entorno: desde Inngest local para develop y desde Inngest Cloud para producción. */
export const clerkImportRequested = eventType("agrodata/clerk.import-users.requested", {
  schema: z.object({}),
});
