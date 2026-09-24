import { NextResponse, type NextRequest } from "next/server";
import {
  verifyWhatsAppSignature,
  whatsappWebhookPayloadSchema,
  persistWhatsAppWebhookEvent,
} from "@repo/core";
import { inngest } from "@/inngest/client";
import { whatsappMessageReceived } from "@/inngest/events";

/** Handshake de suscripción del webhook -- Meta lo llama una sola vez al
 *  configurar la URL en el panel, y de nuevo cada vez que se cambia. */
export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

/** Recibe los eventos reales. Devuelve 200 apenas el evento queda persistido
 *  de forma idempotente -- el procesamiento pesado (Claude, etc.) corre
 *  aparte en Inngest, nunca acá adentro, para no bloquear el ack a Meta ni
 *  arriesgar un timeout. */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const signature = request.headers.get("x-hub-signature-256");
  if (!verifyWhatsAppSignature(rawBody, signature)) {
    return new NextResponse("Invalid signature", { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const parsed = whatsappWebhookPayloadSchema.safeParse(json);
  if (!parsed.success) {
    // Payload con una forma que no esperábamos -- no reventamos: lo logueamos
    // para poder ajustar el schema, y le confirmamos 200 a Meta igual (si
    // devolvemos error acá, Meta reintenta este mismo payload indefinidamente).
    console.error("[whatsapp/webhook] payload no reconocido", JSON.stringify(json));
    return new NextResponse("OK", { status: 200 });
  }

  for (const entry of parsed.data.entry) {
    for (const change of entry.changes) {
      const messages = change.value.messages ?? [];
      for (const message of messages) {
        const { isNew } = await persistWhatsAppWebhookEvent(message.id, message);
        if (!isNew) continue; // reintento de Meta del mismo mensaje -- ya lo procesamos

        const event = whatsappMessageReceived.create({
          webhookEventId: message.id,
          waId: message.from,
          messageType: message.type,
          textBody: message.text?.body,
          mediaId: message.image?.id ?? message.audio?.id ?? message.document?.id,
          mediaMimeType: message.image?.mime_type ?? message.audio?.mime_type ?? message.document?.mime_type,
        });
        try {
          await event.validate();
          await inngest.send(event);
        } catch (error) {
          // No debería pasar nunca (el payload ya validó contra
          // `whatsappWebhookPayloadSchema` arriba) -- si pasa, un mensaje
          // corrupto no debe tirar abajo el resto del batch ni hacer que
          // Meta reintente este payload para siempre.
          console.error("[whatsapp/webhook] evento inválido para Inngest", message.id, error);
        }
      }
      // `change.value.statuses` (delivered/read) se reconoce y se ignora a
      // propósito -- no hay nada que procesar todavía para esos eventos.
    }
  }

  return new NextResponse("OK", { status: 200 });
}
