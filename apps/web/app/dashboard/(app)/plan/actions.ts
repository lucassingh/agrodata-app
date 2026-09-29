"use server";

import { revalidatePath } from "next/cache";
import { AppError, PLAN_TYPES, requestPlan, type PlanType } from "@repo/core";
import { requireUser } from "@/lib/session";

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
