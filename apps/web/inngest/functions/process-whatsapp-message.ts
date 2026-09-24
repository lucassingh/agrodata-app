import {
  resolveSenderByWaId,
  sendWhatsAppText,
  downloadWhatsAppMedia,
  createRecordSchema,
  createRecord,
} from "@repo/core";
import { extractFarmEvent, toRecordPayload, transcribeAudio, type ExtractedEvent } from "@repo/ai";
import { inngest } from "../client";
import { whatsappMessageReceived } from "../events";

const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function toClaudeImageMimeType(mimeType: string): "image/jpeg" | "image/png" | "image/webp" {
  return SUPPORTED_IMAGE_MIME_TYPES.has(mimeType) ? (mimeType as never) : "image/jpeg";
}

/** Orquesta un mensaje entrante de WhatsApp de punta a punta (texto, foto de
 *  factura, o nota de voz). Cada `step.run` es un punto de reintento durable
 *  e independiente: si el proceso se cae después de bajar el audio pero antes
 *  de transcribirlo, un reintento NO vuelve a descargarlo -- retoma desde el
 *  paso que falló. Una nota de voz se transcribe con `transcribeAudio`
 *  (`gpt-transcribe`) y el texto resultante entra al mismo
 *  `extractFarmEvent` que ya usan los mensajes de texto -- una sola
 *  extracción con Claude para las tres modalidades de entrada.
 *
 *  `triggers` (no un segundo argumento posicional `{event: "..."}`) es la
 *  forma real de `createFunction` en Inngest v4 -- ver `../events.ts`. Pasar
 *  la instancia de `EventType` (no el string) tipa `event.data` acá abajo
 *  contra `whatsappMessageReceivedSchema`. */
export const processWhatsAppMessage = inngest.createFunction(
  { id: "process-whatsapp-message", retries: 3, triggers: [{ event: whatsappMessageReceived }] },
  async ({ event, step }) => {
    const { waId, messageType, textBody, mediaId, mediaMimeType } = event.data;

    const sender = await step.run("resolve-sender", () => resolveSenderByWaId(waId));

    if (!sender) {
      await step.run("reply-unregistered", () =>
        sendWhatsAppText(
          waId,
          "Este número no está registrado en AgroData. Pedile a tu administrador que te invite desde la sección Equipo.",
        ),
      );
      return { status: "unregistered-sender" as const };
    }

    if (!sender.activeTenantId) {
      await step.run("reply-no-active-tenant", () =>
        sendWhatsAppText(
          waId,
          "Tu cuenta no tiene un campo activo seleccionado. Entrá al dashboard y elegí un establecimiento primero.",
        ),
      );
      return { status: "no-active-tenant" as const };
    }
    const activeTenantId = sender.activeTenantId;

    let textForExtraction = textBody;
    let imagePayload: { base64: string; mediaType: ReturnType<typeof toClaudeImageMimeType> } | undefined;
    let isAudioMessage = false;

    if (messageType === "image" && mediaId) {
      const media = await step.run("download-media", () => downloadWhatsAppMedia(mediaId));
      imagePayload = { base64: media.base64, mediaType: toClaudeImageMimeType(media.mimeType ?? mediaMimeType ?? "") };
    } else if (messageType === "audio" && mediaId) {
      isAudioMessage = true;
      const media = await step.run("download-media", () => downloadWhatsAppMedia(mediaId));
      textForExtraction = await step.run("transcribe-audio", () =>
        transcribeAudio({ base64: media.base64, mimeType: media.mimeType ?? mediaMimeType ?? "audio/ogg" }),
      );
    }

    if (!textForExtraction && !imagePayload) {
      const message = isAudioMessage
        ? "No pude entender el audio -- ¿podés mandarlo de nuevo o escribirlo como texto?"
        : "Por ahora solo puedo leer mensajes de texto, notas de voz y fotos de facturas.";
      await step.run("reply-unsupported-type", () => sendWhatsAppText(waId, message));
      return { status: isAudioMessage ? ("empty-transcription" as const) : ("unsupported-message-type" as const) };
    }

    const extracted: ExtractedEvent = await step.run("extract-event", () =>
      extractFarmEvent({ text: textForExtraction, image: imagePayload }),
    );

    if (!extracted.recognized || !extracted.type || !extracted.summary) {
      const question =
        extracted.clarificationQuestion ?? "No pude entender bien tu mensaje. ¿Podés contarme con más detalle qué pasó?";
      await step.run("reply-clarification", () => sendWhatsAppText(waId, question));
      return { status: "needs-clarification" as const };
    }

    const recordInput = createRecordSchema.parse({
      type: extracted.type,
      occurredAt: extracted.occurredAt ?? new Date().toISOString(),
      data: toRecordPayload(extracted),
      source: "WHATSAPP",
      userId: sender.userId,
    });

    const record = await step.run("persist-record", () => createRecord(activeTenantId, recordInput));

    await step.run("reply-confirmation", () =>
      sendWhatsAppText(waId, `✅ Registrado: ${extracted.summary}`),
    );

    return { status: "recorded" as const, recordId: record.id };
  },
);
