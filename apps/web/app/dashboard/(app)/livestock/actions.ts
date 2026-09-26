"use server";

import { revalidatePath } from "next/cache";
import { requireActiveTenantId } from "@/lib/session";
import {
  AppError,
  createWeighing,
  deleteWeighing,
  importWeighings,
  weighingImportSchema,
  weighingSchema,
  type WeighingImportRow,
  type WeighingInput,
} from "@repo/core";

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

async function run<T>(fn: (tenantId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn(await requireActiveTenantId());
    revalidatePath("/dashboard/livestock");
    return { success: true, data };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    throw error;
  }
}

export async function createWeighingAction(input: WeighingInput) {
  const parsed = weighingSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  return run(async (tenantId) => (await createWeighing(tenantId, parsed.data)).adpv);
}

export async function importWeighingsAction(rows: WeighingImportRow[]) {
  const parsed = weighingImportSchema.safeParse(rows);
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  return run((tenantId) => importWeighings(tenantId, parsed.data));
}

export async function deleteWeighingAction(id: string) {
  return run((tenantId) => deleteWeighing(tenantId, id));
}
