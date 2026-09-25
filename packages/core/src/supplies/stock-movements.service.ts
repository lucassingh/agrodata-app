import "server-only";
import { prisma, type Prisma } from "@repo/database";
import { nextStock } from "./stock-math";

type Tx = Prisma.TransactionClient;

export interface StockChange {
  supplyId: string;
  direction: "in" | "out";
  quantity: number;
  source: "INITIAL" | "MANUAL" | "EDIT" | "WHATSAPP";
  /** Solo en ingresos: precio por unidad de esta compra. Pasa a ser el costo del insumo. */
  unitCost?: number | null;
  currency?: "ARS" | "USD" | null;
  pastureId?: string | null;
  recordId?: string | null;
  userId?: string | null;
  date?: Date;
}

/** Único camino para cambiar el stock de un insumo: actualiza la cantidad y deja
 *  el movimiento en el historial, dentro de la transacción que recibe. Un
 *  consumo sin stock no deja movimiento (no se movió nada). */
export async function applyStockChange(tx: Tx, tenantId: string, change: StockChange) {
  const supply = await tx.supply.findFirstOrThrow({ where: { id: change.supplyId, tenantId } });
  const { balance, moved } = nextStock(supply.quantity, change.direction, change.quantity);

  const purchasePrice = change.direction === "in" && change.unitCost ? change.unitCost : null;
  const updated = await tx.supply.update({
    where: { id: supply.id },
    data: {
      quantity: balance,
      ...(purchasePrice !== null ? { cost: purchasePrice, currency: change.currency ?? supply.currency } : {}),
    },
  });

  if (moved > 0) {
    // Una compra se valoriza a su precio; un consumo, al costo vigente del insumo.
    const valuation =
      change.direction === "in"
        ? { unitCost: purchasePrice, currency: change.currency ?? supply.currency }
        : { unitCost: supply.cost, currency: supply.currency };
    await tx.stockMovement.create({
      data: {
        tenantId,
        supplyId: supply.id,
        direction: change.direction === "in" ? "IN" : "OUT",
        quantity: moved,
        balance,
        unitCost: valuation.unitCost,
        currency: valuation.unitCost !== null ? valuation.currency : null,
        source: change.source,
        pastureId: change.pastureId ?? null,
        recordId: change.recordId ?? null,
        userId: change.userId ?? null,
        date: change.date ?? new Date(),
      },
    });
  }
  return { supply: updated, moved };
}

export function listStockMovements(tenantId: string, supplyId: string) {
  return prisma.stockMovement.findMany({
    where: { tenantId, supplyId },
    include: { pasture: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
}

/** Variación neta de stock por insumo desde una fecha (sin el saldo de apertura). */
export async function stockNetChangeSince(tenantId: string, since: Date): Promise<Record<string, number>> {
  const rows = await prisma.stockMovement.groupBy({
    by: ["supplyId", "direction"],
    where: { tenantId, date: { gte: since }, source: { not: "INITIAL" } },
    _sum: { quantity: true },
  });
  const net: Record<string, number> = {};
  for (const row of rows) {
    const quantity = row._sum.quantity ?? 0;
    net[row.supplyId] = (net[row.supplyId] ?? 0) + (row.direction === "IN" ? quantity : -quantity);
  }
  return net;
}
