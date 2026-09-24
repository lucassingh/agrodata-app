import { z } from "zod";

/** Puerto del shape real del webhook de WhatsApp Cloud API (Meta). Los campos
 *  que no usamos quedan como `.optional()` en vez de listarlos todos -- si el
 *  payload real trae algo distinto a lo esperado en los campos que SÍ
 *  necesitamos, `safeParse` falla limpio y se loguea, en vez de que el código
 *  de más abajo reviente con un `undefined` silencioso. */

export const whatsappMessageTypeSchema = z.enum([
  "text",
  "image",
  "audio",
  "document",
  "video",
  "sticker",
  "location",
  "contacts",
  "button",
  "interactive",
  "unknown",
]);

export const whatsappMessageSchema = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string(),
  type: whatsappMessageTypeSchema,
  text: z.object({ body: z.string() }).optional(),
  image: z
    .object({ id: z.string(), mime_type: z.string(), caption: z.string().optional() })
    .optional(),
  audio: z.object({ id: z.string(), mime_type: z.string() }).optional(),
  document: z
    .object({ id: z.string(), mime_type: z.string(), filename: z.string().optional() })
    .optional(),
});
export type WhatsAppMessage = z.infer<typeof whatsappMessageSchema>;

export const whatsappContactSchema = z.object({
  profile: z.object({ name: z.string() }).optional(),
  wa_id: z.string(),
});

export const whatsappStatusSchema = z.object({
  id: z.string(),
  status: z.string(),
  timestamp: z.string(),
  recipient_id: z.string().optional(),
});

export const whatsappChangeValueSchema = z.object({
  messaging_product: z.literal("whatsapp"),
  metadata: z.object({
    display_phone_number: z.string().optional(),
    phone_number_id: z.string(),
  }),
  contacts: z.array(whatsappContactSchema).optional(),
  messages: z.array(whatsappMessageSchema).optional(),
  statuses: z.array(whatsappStatusSchema).optional(),
});

export const whatsappWebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: whatsappChangeValueSchema,
          field: z.string(),
        }),
      ),
    }),
  ),
});
export type WhatsAppWebhookPayload = z.infer<typeof whatsappWebhookPayloadSchema>;
