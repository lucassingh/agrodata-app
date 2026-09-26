"use server";

import { revalidatePath } from "next/cache";
import { requireActiveTenantId, requireUser } from "@/lib/session";
import {
  AppError,
  assertCanDeleteOperationalData,
  assignIncome,
  createCampaign,
  createCampaignSchema,
  createHarvest,
  createHarvestSchema,
  createIncome,
  createIncomeSchema,
  deleteCampaign,
  deleteHarvest,
  deleteIncome,
  updateCampaign,
  updateCampaignSchema,
  type CreateCampaignInput,
  type CreateHarvestInput,
  type CreateIncomeInput,
  type UpdateCampaignInput,
} from "@repo/core";

type ActionResult<T = undefined> = { success: true; data: T } | { success: false; error: string };

const ok = <T>(data: T): ActionResult<T> => ({ success: true, data });
const fail = <T>(message: string): ActionResult<T> => ({ success: false, error: message });

async function run<T>(fn: (tenantId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const tenantId = await requireActiveTenantId();
    const data = await fn(tenantId);
    revalidatePath("/dashboard/economy");
    return ok(data);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function createCampaignAction(input: CreateCampaignInput) {
  const parsed = createCampaignSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  return run(async (tenantId) => (await createCampaign(tenantId, parsed.data)).id);
}

export async function updateCampaignAction(id: string, input: UpdateCampaignInput) {
  const parsed = updateCampaignSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  return run(async (tenantId) => {
    await updateCampaign(tenantId, id, parsed.data);
  });
}

export async function deleteCampaignAction(id: string) {
  const user = await requireUser();
  try {
    assertCanDeleteOperationalData(user.capabilities);
  } catch (error) {
    if (error instanceof Error) return fail(error.message);
    throw error;
  }
  return run((tenantId) => deleteCampaign(tenantId, id));
}

export async function createHarvestAction(campaignId: string, input: CreateHarvestInput) {
  const parsed = createHarvestSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  return run((tenantId) => createHarvest(tenantId, campaignId, parsed.data));
}

export async function deleteHarvestAction(id: string) {
  return run((tenantId) => deleteHarvest(tenantId, id));
}

export async function createIncomeAction(input: CreateIncomeInput) {
  const parsed = createIncomeSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  return run(async (tenantId) => {
    await createIncome(tenantId, parsed.data);
  });
}

export async function deleteIncomeAction(id: string) {
  return run((tenantId) => deleteIncome(tenantId, id));
}

export async function assignIncomeAction(id: string, campaignId: string) {
  return run((tenantId) => assignIncome(tenantId, id, campaignId));
}
