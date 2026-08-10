import "server-only";
import { prisma } from "@repo/database";
import { notFound } from "../errors";
import type { CreateSupplyInput, UpdateSupplyInput } from "./supplies.schema";

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
}

export async function createSupply(tenantId: string, input: CreateSupplyInput) {
  await assertCategoryBelongsToTenant(tenantId, input.categoryId);
  return prisma.supply.create({
    data: {
      tenantId,
      categoryId: input.categoryId,
      name: input.name,
      quantity: input.quantity ?? 0,
      unit: input.unit,
      cost: input.cost,
      currency: input.currency ?? "ARS",
      supplier: input.supplier,
      notes: input.notes,
    },
    include: SUPPLY_INCLUDE,
  });
}

export async function updateSupply(tenantId: string, id: string, input: UpdateSupplyInput) {
  await findSupply(tenantId, id);
  if (input.categoryId) {
    await assertCategoryBelongsToTenant(tenantId, input.categoryId);
  }
  return prisma.supply.update({
    where: { id },
    data: {
      categoryId: input.categoryId,
      name: input.name,
      quantity: input.quantity,
      unit: input.unit,
      cost: input.cost,
      currency: input.currency,
      supplier: input.supplier,
      notes: input.notes,
    },
    include: SUPPLY_INCLUDE,
  });
}

/** Replica el clamp del legacy: "consumo" nunca deja el stock en negativo,
 *  "ingreso" no tiene tope. No genera ningún registro de movimiento -- el legacy
 *  tampoco lo hace, solo pisa el campo `quantity` con el nuevo valor absoluto. */
export async function adjustSupplyStock(
  tenantId: string,
  id: string,
  direction: "in" | "out",
  amount: number,
) {
  const supply = await findSupply(tenantId, id);
  const nextQuantity =
    direction === "in" ? supply.quantity + amount : Math.max(0, supply.quantity - amount);
  return prisma.supply.update({
    where: { id },
    data: { quantity: nextQuantity },
    include: SUPPLY_INCLUDE,
  });
}

export async function deleteSupply(tenantId: string, id: string) {
  await findSupply(tenantId, id);
  await prisma.supply.delete({ where: { id } });
}
