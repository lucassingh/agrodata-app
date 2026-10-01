"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { AppError, PLAN_TYPES, refreshMyPayment, requestPlan, startCheckout, type PlanType } from "@repo/core";
import { requireUser } from "@/lib/session";
import { paymentsEnabled } from "@/lib/payments";

type ActionResult = { success: true } | { success: false; error: string };

/** La persona pide un plan: queda anotado y el equipo lo activa desde Soporte. */
export async function requestPlanAction(plan: PlanType): Promise<ActionResult> {
  const user = await requireUser();
  if (!PLAN_TYPES.includes(plan)) return { success: false, error: "Plan inválido." };
  try {
    await requestPlan(user.id, plan);
    revalidatePath("/dashboard/plan");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    throw error;
  }
}

/** Arma el cobro en Mercado Pago y devuelve el link para ir a pagar. */
export async function startCheckoutAction(plan: PlanType, months: number): Promise<{ success: true; url: string } | { success: false; error: string }> {
  const user = await requireUser();
  if (!paymentsEnabled()) return { success: false, error: "Los pagos con Mercado Pago todavía no están habilitados." };
  if (!PLAN_TYPES.includes(plan)) return { success: false, error: "Plan inválido." };
  try {
    const requestHeaders = await headers();
    const baseUrl = requestHeaders.get("origin") ?? process.env.AUTH_URL ?? "http://localhost:3000";
    const { checkoutUrl } = await startCheckout({ userId: user.id, plan, months, baseUrl });
    return { success: true, url: checkoutUrl };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    console.error("[pagos] no se pudo armar el cobro", { userId: user.id, plan, months, error });
    return { success: false, error: "No pudimos conectar con Mercado Pago. Probá de nuevo en un rato." };
  }
}

/** «Ya pagué»: consulta el pago en Mercado Pago y, si está aprobado, activa el plan. */
export async function refreshPaymentAction(paymentId: string): Promise<{ success: true; status: string } | { success: false; error: string }> {
  const user = await requireUser();
  try {
    const payment = await refreshMyPayment(user.id, paymentId);
    revalidatePath("/dashboard", "layout");
    return { success: true, status: payment.status };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    console.error("[pagos] no se pudo revisar el pago", { userId: user.id, paymentId, error });
    return { success: false, error: "No pudimos consultar Mercado Pago. Probá de nuevo en un rato." };
  }
}
