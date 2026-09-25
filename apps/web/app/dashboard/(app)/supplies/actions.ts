"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireActiveTenantId } from "@/lib/session";
import {
  AppError,
  assertCanDeleteOperationalData,
  createSupplySchema,
  updateSupplySchema,
  adjustSupplyStockSchema,
  createSupply,
  updateSupply,
  deleteSupply,
  adjustSupplyStock,
  findSupply,
  createRecord,
  listStockMovements,
  type CreateSupplyInput,
  type UpdateSupplyInput,
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

export async function createSupplyAction(
  input: CreateSupplyInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = createSupplySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  try {
    const user = await requireUser();
    const tenantId = await requireActiveTenantId();
    const supply = await createSupply(tenantId, parsed.data, user.id);
    revalidatePath("/dashboard/supplies");
    return ok({ id: supply.id });
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function updateSupplyAction(
  id: string,
  input: UpdateSupplyInput,
): Promise<ActionResult> {
  const parsed = updateSupplySchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  try {
    const user = await requireUser();
    const tenantId = await requireActiveTenantId();
    await updateSupply(tenantId, id, parsed.data, user.id);
    revalidatePath("/dashboard/supplies");
    return ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function adjustSupplyStockAction(
  id: string,
  direction: "in" | "out",
  amount: number,
  unitCost?: number,
): Promise<ActionResult> {
  const parsed = adjustSupplyStockSchema.safeParse({ direction, amount, unitCost });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  try {
    const user = await requireUser();
    const tenantId = await requireActiveTenantId();
    await adjustSupplyStock(tenantId, id, { ...parsed.data, userId: user.id });
    revalidatePath("/dashboard/supplies");
    return ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function deleteSupplyAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    assertCanDeleteOperationalData(user.capabilities);
    const tenantId = await requireActiveTenantId();
    await deleteSupply(tenantId, id);
    revalidatePath("/dashboard/supplies");
    return ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    if (error instanceof Error) return fail(error.message);
    throw error;
  }
}

/** Replica el botón "Agregar dato al historial" del diálogo de éxito del legacy:
 *  paso manual y opcional, solo disponible justo después de crear un insumo. No hay
 *  ningún registro equivalente para los ajustes de stock (ingreso/consumo). */
export async function addSupplyPurchaseRecordAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const tenantId = await requireActiveTenantId();
    const supply = await findSupply(tenantId, id);
    await createRecord(tenantId, {
      type: "PURCHASE",
      occurredAt: new Date().toISOString(),
      data: {
        summary: `Alta de insumo: ${supply.name} · ${supply.quantity} ${supply.unit ?? "u."}`,
        supplyId: supply.id,
        supplyCategoryId: supply.categoryId,
        supplyName: supply.name,
      },
      source: "plataforma",
      userId: user.id,
    });
    return ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export interface StockMovementRow {
  id: string;
  date: string;
  direction: "IN" | "OUT";
  quantity: number;
  balance: number;
  unitCost: number | null;
  currency: "ARS" | "USD" | null;
  source: "INITIAL" | "MANUAL" | "EDIT" | "WHATSAPP";
  pastureName: string | null;
}

export async function listStockMovementsAction(supplyId: string): Promise<ActionResult<StockMovementRow[]>> {
  try {
    const tenantId = await requireActiveTenantId();
    const movements = await listStockMovements(tenantId, supplyId);
    return ok(
      movements.map((m) => ({
        id: m.id,
        date: m.date.toISOString(),
        direction: m.direction,
        quantity: m.quantity,
        balance: m.balance,
        unitCost: m.unitCost,
        currency: m.currency,
        source: m.source,
        pastureName: m.pasture?.name ?? null,
      })),
    );
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}
