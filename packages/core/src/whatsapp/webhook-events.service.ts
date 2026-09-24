import "server-only";
import { prisma, type Prisma } from "@repo/database";
import { isUniqueConstraintError } from "../prisma-errors";

export interface PersistResult {
  id: string;
  isNew: boolean;
}

/** Inserta el evento crudo del webhook con `externalId` único -- si ya existe
 *  (reintento de Meta), la constraint de la DB lo rechaza y se devuelve
 *  `isNew: false` sin volver a procesar nada. Esta es la deduplicación real:
 *  a prueba de condición de carrera entre dos entregas concurrentes del
 *  mismo evento, algo que un "buscar y después insertar" no garantiza. */
export async function persistWhatsAppWebhookEvent(
  externalId: string,
  payload: unknown,
): Promise<PersistResult> {
  try {
    const event = await prisma.webhookEvent.create({
      data: {
        channel: "whatsapp",
        eventType: "message",
        externalId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
    return { id: event.id, isNew: true };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const existing = await prisma.webhookEvent.findUniqueOrThrow({ where: { externalId } });
      return { id: existing.id, isNew: false };
    }
    throw error;
  }
}
