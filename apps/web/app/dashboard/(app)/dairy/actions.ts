"use server";

import { revalidatePath } from "next/cache";
import { requireActiveTenantId } from "@/lib/session";
import {
  AppError,
  createMilkSettlement,
  deleteMilkRecord,
  deleteMilkSettlement,
  milkRecordSchema,
  milkSettlementSchema,
  saveMilkRecord,
  type MilkRecordInput,
  type MilkSettlementInput,
} from "@repo/core";

type ActionResult = { success: true } | { success: false; error: string };

async function run(fn: (tenantId: string) => Promise<unknown>): Promise<ActionResult> {
  try {
    await fn(await requireActiveTenantId());
    revalidatePath("/dashboard/dairy");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    throw error;
  }
}

export async function saveMilkRecordAction(input: MilkRecordInput): Promise<ActionResult> {
  const parsed = milkRecordSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  return run((tenantId) => saveMilkRecord(tenantId, parsed.data));
}

export async function deleteMilkRecordAction(id: string): Promise<ActionResult> {
  return run((tenantId) => deleteMilkRecord(tenantId, id));
}

export async function createMilkSettlementAction(input: MilkSettlementInput): Promise<ActionResult> {
  const parsed = milkSettlementSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  return run((tenantId) => createMilkSettlement(tenantId, parsed.data));
}

export async function deleteMilkSettlementAction(id: string): Promise<ActionResult> {
  return run((tenantId) => deleteMilkSettlement(tenantId, id));
}
