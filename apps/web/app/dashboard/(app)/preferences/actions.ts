"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireActiveTenantId } from "@/lib/session";
import {
  AppError,
  assertCanDeleteOperationalData,
  createAnimalCategorySchema,
  createAnimalCategory,
  deleteAnimalCategory,
  createCropConfigSchema,
  createCropConfig,
  deleteCropConfig,
  rodeoSchema,
  createRodeo,
  updateRodeo,
  deleteRodeo,
  createSupplyCategorySchema,
  createSupplyCategory,
  deleteSupplyCategory,
  createExpenseCategorySchema,
  createExpenseCategory,
  deleteExpenseCategory,
  updateTenantSchema,
  updateTenant,
  alertSettingsSchema,
  saveAlertSettings,
  setMemberWhatsappAlerts,
  type AlertSettings,
  type RodeoInput,
} from "@repo/core";

type ActionResult = { success: true } | { success: false; error: string };

function ok(): ActionResult {
  return { success: true };
}

function fail(message: string): ActionResult {
  return { success: false, error: message };
}

async function withActiveTenant(
  run: (tenantId: string) => Promise<void>,
): Promise<ActionResult> {
  try {
    const tenantId = await requireActiveTenantId();
    await run(tenantId);
    revalidatePath("/dashboard/preferences");
    return ok();
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

async function withDeletePermission(
  run: (tenantId: string) => Promise<void>,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    assertCanDeleteOperationalData(user.capabilities);
    if (!user.activeTenantId) return fail("No hay un campo activo seleccionado.");
    await run(user.activeTenantId);
    revalidatePath("/dashboard/preferences");
    return ok();
  } catch (error) {
    if (error instanceof Error) return fail(error.message);
    throw error;
  }
}

// ─── Animales ────────────────────────────────────────────

export async function createAnimalCategoryAction(name: string): Promise<ActionResult> {
  const parsed = createAnimalCategorySchema.safeParse({ name });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  return withActiveTenant((tenantId) => createAnimalCategory(tenantId, parsed.data).then(() => {}));
}

export async function removeAnimalCategoryAction(id: string): Promise<ActionResult> {
  return withDeletePermission((tenantId) => deleteAnimalCategory(tenantId, id));
}

// ─── Cultivos ────────────────────────────────────────────

export async function createCropConfigAction(name: string): Promise<ActionResult> {
  const parsed = createCropConfigSchema.safeParse({ name });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  return withActiveTenant((tenantId) => createCropConfig(tenantId, parsed.data).then(() => {}));
}

export async function removeCropConfigAction(id: string): Promise<ActionResult> {
  return withDeletePermission((tenantId) => deleteCropConfig(tenantId, id));
}

// ─── Rodeos ──────────────────────────────────────────────

export async function createRodeoAction(input: RodeoInput): Promise<ActionResult> {
  const parsed = rodeoSchema.safeParse(input);
  if (!parsed.success) return ok(); // el legacy no-opea silenciosamente si el nombre viene vacío
  return withActiveTenant((tenantId) => createRodeo(tenantId, parsed.data).then(() => {}));
}

export async function updateRodeoAction(id: string, input: RodeoInput): Promise<ActionResult> {
  const parsed = rodeoSchema.safeParse(input);
  if (!parsed.success) return ok();
  return withActiveTenant((tenantId) => updateRodeo(tenantId, id, parsed.data).then(() => {}));
}

export async function removeRodeoAction(id: string): Promise<ActionResult> {
  return withDeletePermission((tenantId) => deleteRodeo(tenantId, id));
}

// ─── Insumos (categorías) ────────────────────────────────

export async function createSupplyCategoryAction(
  name: string,
  code?: string,
): Promise<ActionResult> {
  const parsed = createSupplyCategorySchema.safeParse({ name, code });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  return withActiveTenant((tenantId) =>
    createSupplyCategory(tenantId, parsed.data).then(() => {}),
  );
}

export async function removeSupplyCategoryAction(id: string): Promise<ActionResult> {
  return withDeletePermission((tenantId) => deleteSupplyCategory(tenantId, id));
}

// ─── Gastos (categorías) ─────────────────────────────────

export async function createExpenseCategoryAction(
  name: string,
  color: string,
): Promise<ActionResult> {
  const parsed = createExpenseCategorySchema.safeParse({ name, color });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  return withActiveTenant((tenantId) =>
    createExpenseCategory(tenantId, parsed.data).then(() => {}),
  );
}

export async function removeExpenseCategoryAction(id: string): Promise<ActionResult> {
  return withDeletePermission((tenantId) => deleteExpenseCategory(tenantId, id));
}

// ─── Campo (config del tenant activo) ───────────────────

export async function updateTenantConfigAction(
  tenantId: string,
  input: unknown,
): Promise<ActionResult> {
  const parsed = updateTenantSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Completá el nombre del campo.");
  }
  try {
    const user = await requireUser();
    await updateTenant(user.id, tenantId, parsed.data);
    revalidatePath("/dashboard/preferences");
    revalidatePath("/dashboard", "layout");
    return ok();
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

/** La configuración de los avisos del campo la cambian el dueño y el encargado. */
export async function saveAlertSettingsAction(input: AlertSettings): Promise<ActionResult> {
  const user = await requireUser();
  if (!user.isSuperAdmin && user.fieldRole !== "OWNER" && user.fieldRole !== "ADMIN") {
    return fail("Los avisos del campo los configuran el dueño y el encargado.");
  }
  const parsed = alertSettingsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Valores inválidos.");
  return withActiveTenant((tenantId) => saveAlertSettings(tenantId, parsed.data));
}

/** Cada uno decide si recibe los avisos del campo activo por WhatsApp. */
export async function setWhatsappAlertsAction(enabled: boolean): Promise<ActionResult> {
  const user = await requireUser();
  return withActiveTenant((tenantId) => setMemberWhatsappAlerts(user.id, tenantId, enabled));
}
