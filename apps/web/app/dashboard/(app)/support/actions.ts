"use server";

import { revalidatePath } from "next/cache";
import { requestOrigin } from "@/lib/request-origin";
import {
  activatePlan,
  AppError,
  assertPlatformStaff,
  cancelPlan,
  createAccessInvite,
  extendTrial,
  PLAN_TYPES,
  setSubscriptionNote,
  updateDemoRequestStatus,
  type PlanType,
} from "@repo/core";
import type { DemoRequestStatus } from "@repo/database";
import { requireUser } from "@/lib/session";

const STATUSES: DemoRequestStatus[] = ["NEW", "CONTACTED", "DISCARDED"];

export async function updateDemoRequestStatusAction(
  id: string,
  status: DemoRequestStatus,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireUser();
  try {
    assertPlatformStaff(user.email);
    if (!STATUSES.includes(status)) return { success: false, error: "Estado inválido." };
    await updateDemoRequestStatus(id, status);
    revalidatePath("/dashboard/support");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    throw error;
  }
}

type ActionResult = { success: true } | { success: false; error: string };

/** Todo lo de planes de otras personas es solo para el equipo de Campia. */
async function asStaff(run: () => Promise<void>): Promise<ActionResult> {
  const user = await requireUser();
  try {
    assertPlatformStaff(user.email);
    await run();
    revalidatePath("/dashboard/support");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    throw error;
  }
}

export async function activatePlanAction(userId: string, plan: PlanType, months: number): Promise<ActionResult> {
  if (!PLAN_TYPES.includes(plan)) return { success: false, error: "Plan inválido." };
  return asStaff(() => activatePlan(userId, plan, months));
}

export async function extendTrialAction(userId: string, days: number): Promise<ActionResult> {
  return asStaff(() => extendTrial(userId, days));
}

export async function cancelPlanAction(userId: string): Promise<ActionResult> {
  return asStaff(() => cancelPlan(userId));
}

export async function setSubscriptionNoteAction(userId: string, note: string): Promise<ActionResult> {
  return asStaff(() => setSubscriptionNote(userId, note));
}

export type GrantAccessResult =
  | { success: true; link: string; emailed: boolean; whatsappText: string }
  | { success: false; error: string };

/** Acceso anticipado: crea (o renueva) la invitación de una persona y le manda el mail.
 *  El link sale del dominio desde el que se usa Soporte (producción, develop o local). */
export async function grantAccessAction(input: { email: string; name: string; demoRequestId: string | null }): Promise<GrantAccessResult> {
  const user = await requireUser();
  try {
    assertPlatformStaff(user.email);
    const baseUrl = await requestOrigin();
    const result = await createAccessInvite({
      email: input.email,
      name: input.name,
      demoRequestId: input.demoRequestId,
      createdBy: user.id,
      baseUrl,
    });
    revalidatePath("/dashboard/support");
    return { success: true, ...result };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    throw error;
  }
}
