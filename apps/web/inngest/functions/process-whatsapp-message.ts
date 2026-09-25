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
  listExpenseCategoryNames,
  planExpenseEffect,
  applyExpenseEffect,
  type ExpenseEventData,
} from "@repo/core";
import {
  extractFarmEvent,
  interpretPendingReply,
  toRecordPayload,
  transcribeAudio,
  type ExtractedEvent,
} from "@repo/ai";
import { inngest } from "../client";
import { whatsappMessageReceived } from "../events";

const SUPPORTED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function toClaudeImageMimeType(mimeType: string): "image/jpeg" | "image/png" | "image/webp" {
  return SUPPORTED_IMAGE_MIME_TYPES.has(mimeType) ? (mimeType as never) : "image/jpeg";
}

function toExpenseEventData(extracted: ExtractedEvent & { type: string; summary: string }): ExpenseEventData {
  return {
    type: extracted.type,
    summary: extracted.summary,
    occurredAt: extracted.occurredAt,
    monto: extracted.monto,
    moneda: extracted.moneda,
    contraparte: extracted.contraparte,
    categoria: extracted.categoria,
  };
}

/** Orquesta un mensaje entrante de WhatsApp de punta a punta (texto, foto de
 *  factura, o nota de voz). Cada `step.run` es un punto de reintento durable
 *  e independiente: si el proceso se cae a mitad de camino, un reintento
 *  retoma desde el paso que falló sin repetir los anteriores.
 *
 *  Además del log en `Record` (historial de Datos), el mensaje impacta en los
 *  módulos reales (Slice C de la Fase 4). Hoy: los gastos con monto se cargan en
 *  Gastos. Si falta una entidad (ej. la categoría), el bot pregunta antes de
 *  crear nada y guarda una `PendingWhatsAppAction`; el mensaje siguiente del
 *  productor se interpreta primero como respuesta a esa pregunta.
 *
 *  `triggers` (no un segundo argumento posicional `{event: "..."}`) es la
 *  forma real de `createFunction` en Inngest v4 -- ver `../events.ts`. */
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
          sendWhatsAppText(waId, "Listo, no cargué nada. Si querés, mandame el dato de nuevo como corresponda."),
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

    // ── Extracción ─────────────────────────────────────────────────────────
    const expenseCategories = await step.run("load-expense-categories", () =>
      listExpenseCategoryNames(activeTenantId),
    );

    const extracted: ExtractedEvent = await step.run("extract-event", () =>
      extractFarmEvent({ text: textForExtraction, image: imagePayload, context: { expenseCategories } }),
    );

    if (!extracted.recognized || !extracted.type || !extracted.summary) {
      const question =
        extracted.clarificationQuestion ?? "No pude entender bien tu mensaje. ¿Podés contarme con más detalle qué pasó?";
      await step.run("reply-clarification", () => sendWhatsAppText(waId, notice + question));
      return { status: "needs-clarification" as const };
    }

    // ── Log en el historial de Datos (siempre) ─────────────────────────────
    const recordInput = createRecordSchema.parse({
      type: extracted.type,
      occurredAt: extracted.occurredAt ?? new Date().toISOString(),
      data: toRecordPayload(extracted),
      source: "WHATSAPP",
      userId: sender.userId,
    });
    const record = await step.run("persist-record", () => createRecord(activeTenantId, recordInput));

    // ── Efecto en Gastos ───────────────────────────────────────────────────
    const expenseEvent = toExpenseEventData({ ...extracted, type: extracted.type, summary: extracted.summary });
    const expensePlan = await step.run("plan-expense", () => planExpenseEffect(activeTenantId, expenseEvent));

    if (expensePlan.kind === "ready") {
      const confirmation = await step.run("create-expense", () =>
        applyExpenseEffect(activeTenantId, expenseEvent, { id: expensePlan.categoryId, name: expensePlan.categoryName }),
      );
      await step.run("reply-confirmation", () => sendWhatsAppText(waId, notice + confirmation));
      return { status: "expense-created" as const, recordId: record.id };
    }

    if (expensePlan.kind === "needs-new-category") {
      await step.run("save-pending-action", () =>
        savePendingAction({
          tenantId: activeTenantId,
          userId: sender.userId,
          waId,
          question: expensePlan.question,
          action: {
            actionType: "CREATE_EXPENSE_WITH_NEW_CATEGORY",
            payload: { categoryName: expensePlan.categoryName, expense: expenseEvent },
          },
        }),
      );
      await step.run("reply-question", () => sendWhatsAppText(waId, notice + expensePlan.question));
      return { status: "awaiting-confirmation" as const, recordId: record.id };
    }

    await step.run("reply-confirmation", () =>
      sendWhatsAppText(waId, `${notice}✅ Registrado: ${extracted.summary}`),
    );

    return { status: "recorded" as const, recordId: record.id };
  },
);
