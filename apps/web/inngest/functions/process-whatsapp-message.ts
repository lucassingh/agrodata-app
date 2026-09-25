import {
  resolveSenderByWaId,
  sendWhatsAppText,
  downloadWhatsAppMedia,
  createRecordSchema,
  createRecord,
  getActivePendingAction,
  discardPendingAction,
  executePendingAction,
  savePendingAction,
  loadTenantCatalog,
  planMessageEffects,
  applyMessagePlan,
  confirmationQuestion,
  resultMessage,
  type FarmEvent,
  type TenantCatalog,
} from "@repo/core";
import {
  extractFarmEvent,
  interpretPendingReply,
  toRecordPayload,
  transcribeAudio,
  type ExtractedEvent,
  type ExtractionContext,
} from "@repo/ai";
import * as Sentry from "@sentry/nextjs";
import { inngest } from "../client";
import { whatsappMessageReceived } from "../events";

const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function toClaudeImageMimeType(mimeType: string): "image/jpeg" | "image/png" | "image/webp" {
  return SUPPORTED_IMAGE_MIME_TYPES.has(mimeType) ? (mimeType as never) : "image/jpeg";
}

/** Lo que Claude necesita saber del campo para elegir nombres que ya existen. */
function toExtractionContext(catalog: TenantCatalog): ExtractionContext {
  const animalTypes = new Set([
    ...catalog.animalCategories.map((category) => category.name),
    ...catalog.pastures.flatMap((pasture) => pasture.animals.map((animal) => animal.animalType)),
  ]);
  return {
    expenseCategories: catalog.expenseCategories.map((category) => category.name),
    supplies: catalog.supplies.map((supply) => ({ name: supply.name, unit: supply.unit })),
    pastures: catalog.pastures.map((pasture) => pasture.name),
    animalTypes: [...animalTypes],
  };
}

function toFarmEvent(extracted: ExtractedEvent, type: string): FarmEvent {
  return {
    type,
    summary: extracted.summary,
    occurredAt: extracted.occurredAt,
    potrero: extracted.potrero,
    destinoPotrero: extracted.destinoPotrero,
    cultivo: extracted.cultivo,
    hectareas: extracted.hectareas,
    cantidad: extracted.cantidad,
    unidad: extracted.unidad,
    item: extracted.item,
    producto: extracted.producto,
    movimientoStock: extracted.movimientoStock,
    kilos: extracted.kilos,
    monto: extracted.monto,
    moneda: extracted.moneda,
    contraparte: extracted.contraparte,
    dosis: extracted.dosis,
    categoria: extracted.categoria,
  };
}

/** Orquesta un mensaje entrante de WhatsApp de punta a punta (texto, foto de
 *  factura, o nota de voz). Cada `step.run` es un punto de reintento durable
 *  e independiente: si el proceso se cae a mitad de camino, un reintento
 *  retoma desde el paso que falló sin repetir los anteriores.
 *
 *  Además del log en `Record` (historial de Datos), el mensaje impacta en los
 *  módulos reales (Slice C de la Fase 4): Gastos, stock de Insumos, cultivos y
 *  animales de Potreros, y Tareas. `planMessageEffects` decide todo eso sin
 *  tocar la base; si hace falta crear algo (categoría, insumo, potrero...), el
 *  bot pregunta antes y guarda una `PendingWhatsAppAction`; el mensaje
 *  siguiente del productor se interpreta primero como respuesta a esa pregunta.
 *
 *  `triggers` (no un segundo argumento posicional `{event: "..."}`) es la
 *  forma real de `createFunction` en Inngest v4 -- ver `../events.ts`. */
export const processWhatsAppMessage = inngest.createFunction(
  {
    id: "process-whatsapp-message",
    retries: 3,
    triggers: [{ event: whatsappMessageReceived }],
    // Se agotaron los reintentos: sin esto el productor se queda esperando una
    // respuesta que nunca llega y nadie se entera del error.
    onFailure: async ({ event, error, step }) => {
      const { waId, webhookEventId } = event.data.event.data;
      console.error("[whatsapp] mensaje sin procesar tras agotar reintentos", {
        runId: event.data.run_id,
        webhookEventId,
        error: error.message,
      });
      Sentry.captureException(error, {
        tags: { flow: "whatsapp" },
        extra: { runId: event.data.run_id, webhookEventId },
      });
      await step.run("reply-processing-failed", async () => {
        try {
          await sendWhatsAppText(
            waId,
            "No pude procesar tu último mensaje por un error de nuestro lado. No se cargó nada: probá mandarlo de nuevo en unos minutos.",
          );
        } catch (sendError) {
          console.error("[whatsapp] tampoco se pudo avisar del error al productor", sendError);
        }
      });
    },
  },
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

    // ── ¿Es la respuesta a una pregunta pendiente? ─────────────────────────
    let notice = "";
    const pending = await step.run("load-pending-action", () => getActivePendingAction(waId));

    if (pending) {
      const intent = textForExtraction
        ? await step.run("interpret-pending-reply", () =>
            interpretPendingReply({ question: pending.question, reply: textForExtraction }),
          )
        : "unrelated";

      if (intent === "confirm") {
        const confirmation = await step.run("execute-pending-action", () => executePendingAction(pending));
        await step.run("reply-pending-confirmed", () => sendWhatsAppText(waId, confirmation));
        return { status: "pending-confirmed" as const };
      }

      await step.run("discard-pending-action", () => discardPendingAction(pending.id));
      if (intent === "reject") {
        await step.run("reply-pending-rejected", () =>
          sendWhatsAppText(
            waId,
            "Listo, no cargué nada en el sistema (el mensaje queda en el historial de Datos). Si querés, mandame el dato de nuevo como corresponda.",
          ),
        );
        return { status: "pending-rejected" as const };
      }
      // Cambió de tema: se descarta lo anterior y se procesa este mensaje normal.
      notice = "(Dejé sin cargar lo que te había preguntado antes.)\n";
    }

    if (!textForExtraction && !imagePayload) {
      const message = isAudioMessage
        ? "No pude entender el audio -- ¿podés mandarlo de nuevo o escribirlo como texto?"
        : "Por ahora solo puedo leer mensajes de texto, notas de voz y fotos de facturas.";
      await step.run("reply-unsupported-type", () => sendWhatsAppText(waId, notice + message));
      return { status: isAudioMessage ? ("empty-transcription" as const) : ("unsupported-message-type" as const) };
    }

    // ── Extracción, con el catálogo real del campo como contexto ───────────
    const catalog = await step.run("load-tenant-catalog", () => loadTenantCatalog(activeTenantId));

    const extracted: ExtractedEvent = await step.run("extract-event", () =>
      extractFarmEvent({ text: textForExtraction, image: imagePayload, context: toExtractionContext(catalog) }),
    );

    if (!extracted.recognized || !extracted.type || !extracted.summary) {
      const question =
        extracted.clarificationQuestion || "No pude entender bien tu mensaje. ¿Podés contarme con más detalle qué pasó?";
      await step.run("reply-clarification", () => sendWhatsAppText(waId, notice + question));
      return { status: "needs-clarification" as const };
    }

    // ── Log en el historial de Datos (siempre) ─────────────────────────────
    const recordInput = createRecordSchema.parse({
      type: extracted.type,
      // Una fecha sola (YYYY-MM-DD) se guarda al mediodía de Argentina: a medianoche UTC
      // se mostraba como las 21 hs del día anterior.
      occurredAt: extracted.occurredAt ? `${extracted.occurredAt}T12:00:00-03:00` : new Date().toISOString(),
      data: toRecordPayload(extracted),
      source: "WHATSAPP",
      userId: sender.userId,
      rawMessage: textForExtraction?.slice(0, 4000),
    });
    const record = await step.run("persist-record", () => createRecord(activeTenantId, recordInput));

    // ── Efectos en los módulos ─────────────────────────────────────────────
    const farmEvent = toFarmEvent(extracted, extracted.type);
    // Dentro de un paso para que la fecha de "hoy" quede fija ante reintentos.
    const plan = await step.run("plan-effects", () => planMessageEffects(farmEvent, catalog));

    if (plan.creations.length > 0) {
      const question = confirmationQuestion(plan);
      await step.run("save-pending-action", () =>
        savePendingAction({
          tenantId: activeTenantId,
          userId: sender.userId,
          waId,
          question,
          action: { actionType: "APPLY_MESSAGE_PLAN", payload: { recordId: record.id, event: farmEvent } },
        }),
      );
      await step.run("reply-question", () => sendWhatsAppText(waId, notice + question));
      return { status: "awaiting-confirmation" as const, recordId: record.id };
    }

    const lines =
      plan.effects.length > 0
        ? (
            await step.run("apply-effects", () =>
              applyMessagePlan({ tenantId: activeTenantId, userId: sender.userId, recordId: record.id, plan }),
            )
          ).lines
        : [];

    await step.run("reply-confirmation", () =>
      sendWhatsAppText(waId, notice + resultMessage(extracted.summary, lines, plan.notes)),
    );

    return { status: "recorded" as const, recordId: record.id, effects: lines.length };
  },
);
