"use server";

import { revalidatePath } from "next/cache";
import { requireActiveTenantId } from "@/lib/session";
import {
  AppError,
  createPastureSchema,
  updatePastureSchema,
  createPasture,
  createPasturesBulk,
  updatePasture,
  deletePasture,
  createAnimalCategorySchema,
  createAnimalCategory,
  createCropConfigSchema,
  createCropConfig,
  type CreatePastureInput,
  type UpdatePastureInput,
} from "@repo/core";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

function fail<T>(message: string): ActionResult<T> {
  return { success: false, error: message };
}

export async function createPastureAction(
  input: CreatePastureInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createPastureSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  try {
    const tenantId = await requireActiveTenantId();
    const pasture = await createPasture(tenantId, parsed.data);
    revalidatePath("/dashboard/pastures");
    return ok({ id: pasture.id });
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function createPasturesBulkAction(
  items: CreatePastureInput[],
): Promise<ActionResult<{ count: number }>> {
  try {
    const tenantId = await requireActiveTenantId();
    const created = await createPasturesBulk(tenantId, items);
    revalidatePath("/dashboard/pastures");
    return ok({ count: created.length });
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function updatePastureAction(
  id: string,
  input: UpdatePastureInput,
): Promise<ActionResult> {
  const parsed = updatePastureSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  try {
    const tenantId = await requireActiveTenantId();
    await updatePasture(tenantId, id, parsed.data);
    revalidatePath("/dashboard/pastures");
    return ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function deletePastureAction(id: string): Promise<ActionResult> {
  try {
    const tenantId = await requireActiveTenantId();
    await deletePasture(tenantId, id);
    revalidatePath("/dashboard/pastures");
    return ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function createCropOptionAction(
  name: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = createCropConfigSchema.safeParse({ name });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  try {
    const tenantId = await requireActiveTenantId();
    const crop = await createCropConfig(tenantId, parsed.data);
    revalidatePath("/dashboard/pastures");
    return ok({ id: crop.id, name: crop.name });
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function createAnimalOptionAction(
  name: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  const parsed = createAnimalCategorySchema.safeParse({ name });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  try {
    const tenantId = await requireActiveTenantId();
    const category = await createAnimalCategory(tenantId, parsed.data);
    revalidatePath("/dashboard/pastures");
    return ok({ id: category.id, name: category.name });
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}
