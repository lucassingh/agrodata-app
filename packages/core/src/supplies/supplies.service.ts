import "server-only";
import { prisma } from "@repo/database";
import { notFound } from "../errors";
import type { CreateSupplyInput, UpdateSupplyInput } from "./supplies.schema";
import { applyStockChange } from "./stock-movements.service";
import { allocateCost } from "../economy/allocations.service";
import { suggestVatRate } from "../economy/vat";

const SUPPLY_INCLUDE = { category: true } as const;

export function listSupplies(tenantId: string) {
  return prisma.supply.findMany({
    where: { tenantId },
    include: SUPPLY_INCLUDE,
    orderBy: [{ category: { name: "asc" } }, { name: "asc" }],
  });
}

export async function findSupply(tenantId: string, id: string) {
  const supply = await prisma.supply.findFirst({
    where: { id, tenantId },
    include: SUPPLY_INCLUDE,
  });
  if (!supply) notFound("Insumo no encontrado");
  return supply;
}

/** El legacy no valida que categoryId pertenezca al tenant (confía solo en la FK,
 *  lo que permite vincular por error una categoría de otro tenant). Se agrega esta
 *  verificación como red de seguridad -- no cambia el camino feliz, solo blinda
 *  contra un POST directo con un categoryId ajeno. */
async function assertCategoryBelongsToTenant(tenantId: string, categoryId: string) {
  const category = await prisma.supplyCategory.findFirst({ where: { id: categoryId, tenantId } });
  if (!category) notFound("Categoría de insumo no encontrada");
  return category;
}

/** El stock inicial entra como primer movimiento del historial. */
export async function createSupply(tenantId: string, input: CreateSupplyInput, userId?: string) {
  const category = await assertCategoryBelongsToTenant(tenantId, input.categoryId);
  return prisma.$transaction(async (tx) => {
    const supply = await tx.supply.create({
      data: {
        tenantId,
        vatRate: suggestVatRate(category.name, input.name),
        categoryId: input.categoryId,
        name: input.name,
        quantity: 0,
        unit: input.unit,
        cost: input.cost,
        currency: input.currency ?? "ARS",
        supplier: input.supplier,
        notes: input.notes,
      },
    });
    if (input.quantity) {
      await applyStockChange(tx, tenantId, {
        supplyId: supply.id,
        direction: "in",
        quantity: input.quantity,
        source: "INITIAL",
        unitCost: input.cost ?? null,
        currency: input.currency ?? "ARS",
        userId,
      });
    }
    return tx.supply.findUniqueOrThrow({ where: { id: supply.id }, include: SUPPLY_INCLUDE });
  });
}

/** Si la edición cambia la cantidad, la diferencia queda como movimiento de ajuste. */
export async function updateSupply(tenantId: string, id: string, input: UpdateSupplyInput, userId?: string) {
  const current = await findSupply(tenantId, id);
  if (input.categoryId) {
    await assertCategoryBelongsToTenant(tenantId, input.categoryId);
  }
  return prisma.$transaction(async (tx) => {
    const delta = input.quantity === undefined ? 0 : input.quantity - current.quantity;
    if (delta !== 0) {
      await applyStockChange(tx, tenantId, {
        supplyId: id,
        direction: delta > 0 ? "in" : "out",
        quantity: Math.abs(delta),
        source: "EDIT",
        userId,
      });
    }
    return tx.supply.update({
      where: { id },
      data: {
        categoryId: input.categoryId,
        name: input.name,
        unit: input.unit,
        cost: input.cost,
        currency: input.currency,
        supplier: input.supplier,
        notes: input.notes,
      },
      include: SUPPLY_INCLUDE,
    });
  });
}

/** Ingreso o consumo desde el dashboard. Mismo clamp del legacy (un consumo no
 *  deja el stock en negativo), pero ahora queda en el historial; un ingreso con
 *  precio actualiza el costo del insumo. */
export async function adjustSupplyStock(
  tenantId: string,
  id: string,
  change: { direction: "in" | "out"; amount: number; unitCost?: number; userId?: string; campaignId?: string },
) {
  const current = await findSupply(tenantId, id);
  return prisma.$transaction(async (tx) => {
    // Un consumo aplicado en una campaña queda en su lote y suma a su costo directo.
    const campaign =
      change.direction === "out" && change.campaignId
        ? await tx.campaign.findFirst({ where: { id: change.campaignId, tenantId } })
        : null;
    if (change.campaignId && change.direction === "out" && !campaign) notFound("Campaña no encontrada");

    const { supply, movement } = await applyStockChange(tx, tenantId, {
      supplyId: id,
      direction: change.direction,
      quantity: change.amount,
      source: "MANUAL",
      unitCost: change.unitCost ?? null,
      userId: change.userId,
      pastureId: campaign?.pastureId ?? null,
    });
    if (campaign && movement && movement.unitCost !== null && movement.currency) {
      await allocateCost(tx, tenantId, [campaign.id], {
        stockMovementId: movement.id,
        amount: Math.round(movement.quantity * movement.unitCost * 100) / 100,
        vatRate: current.vatRate ?? suggestVatRate(current.category.name, current.name),
        currency: movement.currency,
        date: movement.date,
        concept: `${current.name}: ${movement.quantity} ${current.unit ?? ""}`.trim(),
      });
    }
    return supply;
  });
}

export async function deleteSupply(tenantId: string, id: string) {
  await findSupply(tenantId, id);
  await prisma.supply.delete({ where: { id } });
}
