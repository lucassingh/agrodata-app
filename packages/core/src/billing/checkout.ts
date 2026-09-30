/** Cobro con Mercado Pago Checkout Pro (Etapa 6.6): se paga un plan por 1, 3 o 12
 *  meses, en pesos al dólar oficial del día. Puro: se testea sin base ni red. */

import { PLANS, type PlanType } from "./plans";

export const PAYMENT_PERIODS = [1, 3, 12] as const;
export type PaymentPeriod = (typeof PAYMENT_PERIODS)[number];

export const isPaymentPeriod = (months: number): months is PaymentPeriod => (PAYMENT_PERIODS as readonly number[]).includes(months);

/** El anual paga 10 meses: 2 de regalo, como dice la landing. */
export const billedMonths = (months: PaymentPeriod): number => (months === 12 ? 10 : months);

export const PERIOD_LABEL: Record<PaymentPeriod, string> = { 1: "1 mes", 3: "3 meses", 12: "12 meses" };

export interface CheckoutQuote {
  plan: PlanType;
  months: PaymentPeriod;
  amountUsd: number;
  exchangeRate: number;
  /** En pesos enteros: es lo que se cobra. */
  amountArs: number;
}

/** Cuánto sale un plan por un período. Null para el plan a medida (no se paga acá). */
export function checkoutQuote(plan: PlanType, months: PaymentPeriod, usdRate: number): CheckoutQuote | null {
  const monthly = PLANS[plan].monthlyUsd;
  if (monthly === null || !(usdRate > 0)) return null;
  const amountUsd = monthly * billedMonths(months);
  return { plan, months, amountUsd, exchangeRate: usdRate, amountArs: Math.round(amountUsd * usdRate) };
}

/** Sin dos puntos: Mercado Pago cambia esos títulos por «Producto sin descripción». */
export const paymentTitle = (plan: PlanType, months: PaymentPeriod) => `AgroData - Plan ${PLANS[plan].name} (${PERIOD_LABEL[months]})`;

/**
 * Pagos prendidos o apagados. Sin la variable: prendidos en develop y local (con
 * las credenciales de prueba) y apagados en producción hasta que esté el
 * monotributo. Sin credencial, siempre apagados.
 */
export function resolvePaymentsEnabled(env: { PAYMENTS_ENABLED?: string; VERCEL_ENV?: string; hasAccessToken: boolean }): boolean {
  if (!env.hasAccessToken) return false;
  if (env.PAYMENTS_ENABLED === "true") return true;
  if (env.PAYMENTS_ENABLED === "false") return false;
  return env.VERCEL_ENV !== "production";
}

export type LocalPaymentStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

/** Lo que dice Mercado Pago de un pago, lo justo para decidir. */
export interface RemotePayment {
  status: string;
  transactionAmount: number;
  currency: string;
  externalReference: string | null;
}

/**
 * Qué hacer con un pago según Mercado Pago. Solo se activa el plan si el pago es
 * nuestro (referencia), está aprobado y es por el monto pedido, en pesos.
 * «mismatch»: aprobado pero no coincide; no se activa nada y queda en el log.
 */
export function paymentOutcome(
  local: { id: string; amountArs: number },
  remote: RemotePayment,
): { kind: "approve" } | { kind: "status"; status: LocalPaymentStatus } | { kind: "ignore" } | { kind: "mismatch" } {
  if (remote.externalReference !== local.id) return { kind: "ignore" };
  switch (remote.status) {
    case "approved":
      return remote.currency === "ARS" && remote.transactionAmount + 0.5 >= local.amountArs ? { kind: "approve" } : { kind: "mismatch" };
    case "rejected":
      return { kind: "status", status: "REJECTED" };
    case "cancelled":
    case "refunded":
    case "charged_back":
      return { kind: "status", status: "CANCELLED" };
    default:
      // pending, in_process, authorized, in_mediation: todavía no está.
      return { kind: "status", status: "PENDING" };
  }
}

/** Entre varios intentos de pago de una misma preferencia, el que manda: uno
 *  aprobado si hay; si no, el más nuevo. */
export function pickRelevantPayment<T extends { status: string; dateCreated: string }>(payments: T[]): T | null {
  if (payments.length === 0) return null;
  const approved = payments.find((p) => p.status === "approved");
  if (approved) return approved;
  return [...payments].sort((a, b) => b.dateCreated.localeCompare(a.dateCreated))[0]!;
}

/** Fecha con el huso argentino, como la pide Mercado Pago (`2026-10-02T12:00:00.000-03:00`). */
export function mercadoPagoDate(date: Date): string {
  const local = new Date(date.getTime() - 3 * 3_600_000);
  return `${local.toISOString().slice(0, 23)}-03:00`;
}
