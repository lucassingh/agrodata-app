import "server-only";
import { prisma, type Payment, type PlanType } from "@repo/database";
import { badRequest, notFound } from "../errors";
import { checkoutQuote, isPaymentPeriod, mercadoPagoDate, paymentOutcome, paymentTitle, pickRelevantPayment, type RemotePayment } from "./checkout";
import { createPreference, getPayment, MercadoPagoError, searchPaymentsByReference } from "./mercadopago.client";
import { extendPaidUntil } from "./plans";

/** Un link de pago vale dos días: el precio en pesos sale del dólar de hoy. */
const PREFERENCE_TTL_MS = 2 * 86_400_000;

/** El dólar oficial más reciente (venta), con su día. */
export async function officialUsdRate(): Promise<{ sell: number; day: string } | null> {
  const row = await prisma.exchangeRate.findFirst({ where: { kind: "OFICIAL" }, orderBy: { date: "desc" }, select: { sell: true, date: true } });
  return row ? { sell: row.sell, day: row.date.toISOString().slice(0, 10) } : null;
}

/**
 * Arma el cobro de un plan por un período y devuelve el link de Mercado Pago.
 * `baseUrl` es el dominio desde el que se paga: la vuelta y el aviso de pago van
 * ahí (el aviso solo con https: Mercado Pago no llega a localhost).
 */
export async function startCheckout(input: { userId: string; plan: PlanType; months: number; baseUrl: string; now?: Date }) {
  const now = input.now ?? new Date();
  if (!isPaymentPeriod(input.months)) badRequest("Elegí 1, 3 o 12 meses.");
  const rate = await officialUsdRate();
  if (!rate) badRequest("No tenemos la cotización del dólar oficial. Probá en un rato.");
  const quote = checkoutQuote(input.plan, input.months, rate.sell);
  if (!quote) badRequest("Este plan se arma a medida: escribinos.");

  const payment = await prisma.payment.create({
    data: {
      userId: input.userId,
      plan: quote.plan,
      months: quote.months,
      amountUsd: quote.amountUsd,
      amountArs: quote.amountArs,
      exchangeRate: quote.exchangeRate,
    },
  });
  const base = input.baseUrl.replace(/\/$/, "");
  const secure = base.startsWith("https://");
  const preference = await createPreference({
    title: paymentTitle(quote.plan, quote.months),
    amountArs: quote.amountArs,
    externalReference: payment.id,
    returnUrl: `${base}/dashboard/plan/pago`,
    notificationUrl: secure ? `${base}/api/mercadopago/webhook` : null,
    autoReturn: secure,
    expiresAt: mercadoPagoDate(new Date(now.getTime() + PREFERENCE_TTL_MS)),
    metadata: { plan: quote.plan, months: quote.months, user_id: input.userId },
  });
  await prisma.payment.update({ where: { id: payment.id }, data: { preferenceId: preference.id } });
  return { paymentId: payment.id, checkoutUrl: preference.init_point };
}

/**
 * Aplica lo que dice Mercado Pago sobre un pago nuestro. Los meses se suman una
 * sola vez: el primero que marca `appliedAt` activa el plan, en la misma
 * transacción. Llamarla dos veces con el mismo pago no cambia nada.
 */
async function applyRemote(local: Payment, remote: RemotePayment & { id: string }, now = new Date()) {
  const outcome = paymentOutcome(local, remote);
  if (outcome.kind === "ignore") return local;
  if (outcome.kind === "mismatch") {
    console.error("[pagos] pago aprobado que no coincide: no se activa", { paymentId: local.id, mpPaymentId: remote.id, remote });
    return local;
  }
  if (outcome.kind === "status") {
    if (local.appliedAt) return local;
    return prisma.payment.update({ where: { id: local.id }, data: { status: outcome.status, mpPaymentId: remote.id } });
  }
  await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: local.id, appliedAt: null },
      data: { status: "APPROVED", mpPaymentId: remote.id, appliedAt: now },
    });
    if (claimed.count === 0) return;
    const current = await tx.subscription.findUnique({ where: { userId: local.userId }, select: { plan: true, paidUntil: true } });
    const paidUntil = extendPaidUntil(current, local.plan, local.months, now);
    await tx.subscription.upsert({
      where: { userId: local.userId },
      create: { userId: local.userId, trialEndsAt: now, plan: local.plan, paidUntil },
      update: { plan: local.plan, paidUntil, requestedPlan: null, requestedAt: null },
    });
  });
  return prisma.payment.findUniqueOrThrow({ where: { id: local.id } });
}

/** Aviso de Mercado Pago (webhook): trae el pago de su API, nunca confía en el aviso. */
export async function syncMercadoPagoPayment(mpPaymentId: string) {
  let remote;
  try {
    remote = await getPayment(mpPaymentId);
  } catch (error) {
    // Un pago que Mercado Pago no nos muestra no es nuestro: no hay nada que reintentar.
    if (error instanceof MercadoPagoError && error.status === 404) return null;
    throw error;
  }
  if (!remote.externalReference) return null;
  const local = await prisma.payment.findUnique({ where: { id: remote.externalReference } });
  if (!local) return null;
  return applyRemote(local, remote);
}

/** «Ya pagué» o la vuelta del comprador: busca el pago en Mercado Pago por nuestra
 *  referencia. Solo sobre pagos de la persona. */
export async function refreshMyPayment(userId: string, paymentId: string) {
  const local = await prisma.payment.findFirst({ where: { id: paymentId, userId } });
  if (!local) notFound("No encontramos ese pago.");
  if (local.appliedAt) return local;
  const remote = pickRelevantPayment(await searchPaymentsByReference(local.id));
  return remote ? applyRemote(local, remote) : local;
}

export function listMyPayments(userId: string) {
  return prisma.payment.findMany({ where: { userId, NOT: { status: "PENDING", mpPaymentId: null, createdAt: { lt: new Date(Date.now() - PREFERENCE_TTL_MS) } } }, orderBy: { createdAt: "desc" }, take: 24 });
}
