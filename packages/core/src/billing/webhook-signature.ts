/** Firma de los avisos de Mercado Pago (Webhooks): HMAC SHA-256 con la clave
 *  secreta de la aplicación sobre `id:…;request-id:…;ts:…;`. Puro, con tests. */

import { createHmac, timingSafeEqual } from "node:crypto";

/** `x-signature: ts=1742505638683,v1=ced36a…` */
export function parseSignatureHeader(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const [key, ...rest] = part.split("=");
      return [key?.trim(), rest.join("=").trim()];
    }),
  );
  return parts.ts && parts.v1 ? { ts: parts.ts, v1: parts.v1 } : null;
}

/** El texto firmado. Lo que no vino se saca de la plantilla; un id alfanumérico va en minúsculas. */
export function signatureManifest(dataId: string | null, requestId: string | null, ts: string): string {
  return `${dataId ? `id:${dataId.toLowerCase()};` : ""}${requestId ? `request-id:${requestId};` : ""}ts:${ts};`;
}

export function isValidWebhookSignature(input: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const parsed = parseSignatureHeader(input.signatureHeader);
  if (!parsed) return false;
  const expected = createHmac("sha256", input.secret).update(signatureManifest(input.dataId, input.requestId, parsed.ts)).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(parsed.v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
