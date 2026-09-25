"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireActiveTenantId } from "@/lib/session";
import {
  AppError,
  assertCanDeleteOperationalData,
  updateRecordSchema,
  updateRecord,
  deleteRecord,
  type UpdateRecordInput,
} from "@repo/core";

type ActionResult = { success: true } | { success: false; error: string };

export async function updateRecordAction(id: string, input: UpdateRecordInput): Promise<ActionResult> {
  const parsed = updateRecordSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  try {
    const tenantId = await requireActiveTenantId();
    await updateRecord(tenantId, id, parsed.data);
    revalidatePath("/dashboard/data");
    revalidatePath("/dashboard/summary");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    throw error;
  }
}

/** Mismo guard que el borrado en los demás módulos (`canDeleteOperationalData`). */
export async function deleteRecordAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    assertCanDeleteOperationalData(user.capabilities);
    const tenantId = await requireActiveTenantId();
    await deleteRecord(tenantId, id);
    revalidatePath("/dashboard/data");
    revalidatePath("/dashboard/summary");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    throw error;
  }
}
