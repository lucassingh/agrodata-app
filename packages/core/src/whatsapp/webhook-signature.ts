import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** Verifica la firma `X-Hub-Signature-256` que Meta manda en cada webhook,
 *  calculada sobre el body CRUDO (antes de parsear JSON) con el App Secret.
 *  Sin esto, cualquiera que conozca la URL del webhook podría mandar
 *  mensajes falsos haciéndose pasar por WhatsApp. Comparación en tiempo
 *  constante (`timingSafeEqual`) para no filtrar la firma esperada por
 *  temporización. */
export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) throw new Error("Falta la variable de entorno WHATSAPP_APP_SECRET");

  const expected = `sha256=${createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex")}`;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(signatureHeader);
  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
