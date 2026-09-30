import "server-only";
import { z } from "zod";
import type { RemotePayment } from "./checkout";

/** Mercado Pago por su API directa (como Resend): tres llamadas, sin SDK. La
 *  credencial es la de la aplicación; en develop y local, la de prueba. */
const API = "https://api.mercadopago.com";

export class MercadoPagoError extends Error {
  constructor(readonly status: number) {
    super(`Mercado Pago respondió ${status}`);
  }
}

function accessToken(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN");
  return token;
}

async function call<T>(path: string, schema: z.ZodType<T>, init?: RequestInit & { idempotencyKey?: string }): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      "Content-Type": "application/json",
      ...(init?.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
    },
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    console.error("[mercadopago] error", { path, status: response.status, body: JSON.stringify(body).slice(0, 500) });
    throw new MercadoPagoError(response.status);
  }
  return schema.parse(body);
}

const preferenceSchema = z.object({ id: z.string(), init_point: z.string().url() });

export async function createPreference(input: {
  title: string;
  amountArs: number;
  externalReference: string;
  returnUrl: string;
  notificationUrl: string | null;
  /** Vuelve solo al sitio cuando se aprueba (Mercado Pago no lo hace con localhost). */
  autoReturn: boolean;
  expiresAt: string;
  metadata: Record<string, string | number>;
}) {
  return call("/checkout/preferences", preferenceSchema, {
    method: "POST",
    idempotencyKey: input.externalReference,
    body: JSON.stringify({
      items: [{ id: input.externalReference, title: input.title, quantity: 1, unit_price: input.amountArs, currency_id: "ARS" }],
      external_reference: input.externalReference,
      back_urls: { success: input.returnUrl, pending: input.returnUrl, failure: input.returnUrl },
      ...(input.autoReturn ? { auto_return: "approved" } : {}),
      ...(input.notificationUrl ? { notification_url: input.notificationUrl } : {}),
      statement_descriptor: "AGRODATA",
      expires: true,
      expiration_date_to: input.expiresAt,
      metadata: input.metadata,
    }),
  });
}

const paymentSchema = z.object({
  id: z.union([z.number(), z.string()]),
  status: z.string(),
  transaction_amount: z.number(),
  currency_id: z.string(),
  external_reference: z.string().nullable().optional(),
  date_created: z.string(),
});

type MpPayment = z.infer<typeof paymentSchema>;

const toRemote = (p: MpPayment): RemotePayment & { id: string; dateCreated: string } => ({
  id: String(p.id),
  status: p.status,
  transactionAmount: p.transaction_amount,
  currency: p.currency_id,
  externalReference: p.external_reference ?? null,
  dateCreated: p.date_created,
});

export async function getPayment(id: string) {
  return toRemote(await call(`/v1/payments/${encodeURIComponent(id)}`, paymentSchema));
}

/** Los intentos de pago de una preferencia nuestra (por su referencia). */
export async function searchPaymentsByReference(externalReference: string) {
  const result = await call(
    `/v1/payments/search?external_reference=${encodeURIComponent(externalReference)}&sort=date_created&criteria=desc`,
    z.object({ results: z.array(paymentSchema) }),
  );
  return result.results.map(toRemote);
}
