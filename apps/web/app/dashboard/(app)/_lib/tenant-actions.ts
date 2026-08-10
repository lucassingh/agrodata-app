"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import {
  createTenantForUser,
  setActiveTenant,
  createTenantSchema,
  AppError,
  type CreateTenantInput,
} from "@repo/core";

export async function createTenantAction(input: CreateTenantInput) {
  const user = await requireUser();
  const parsed = createTenantSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  try {
    const tenant = await createTenantForUser(user.id, parsed.data);
    revalidatePath("/dashboard", "layout");
    return { success: true as const, tenant };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    throw error;
  }
}

export async function setActiveTenantAction(tenantId: string) {
  const user = await requireUser();
  try {
    await setActiveTenant(user.id, tenantId, user.isSuperAdmin);
    revalidatePath("/dashboard", "layout");
    return { success: true as const };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    throw error;
  }
}
