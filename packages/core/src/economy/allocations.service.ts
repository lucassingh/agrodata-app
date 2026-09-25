import "server-only";
import { prisma, type Prisma } from "@repo/database";
import { notFound } from "../errors";
import { normalizeEntityName } from "../whatsapp/entity-name";
import { splitByHectares } from "./economy-math";

type Db = Prisma.TransactionClient | typeof prisma;

export interface CostSource {
  expenseId?: string;
  stockMovementId?: string;
  amount: number;
  currency: "ARS" | "USD";
  date: Date;
  concept: string;
}

/** A qué campaña va un costo de un lote: la en curso del cultivo mencionado; si
 *  no se menciona cultivo, la única en curso. Con varias y sin pista, ninguna
 *  (no se adivina): se asigna después desde Economía. */
export async function resolveCampaignForPasture(db: Db, tenantId: string, pastureId: string, cropHint: string | null) {
  const open = await db.campaign.findMany({
    where: { tenantId, pastureId, status: "IN_PROGRESS" },
    include: { pasture: { select: { name: true } } },
    orderBy: { sowingDate: "desc" },
  });
  if (cropHint) {
    const match = open.find((c) => normalizeEntityName(c.crop) === normalizeEntityName(cropHint));
    if (match) return { campaign: match, open };
  }
  return { campaign: open.length === 1 ? open[0]! : null, open };
}

/** Asigna un costo a una o varias campañas; entre varias, se reparte por hectáreas. */
export async function allocateCost(db: Db, tenantId: string, campaignIds: string[], source: CostSource) {
  if (campaignIds.length === 0 || source.amount <= 0) return [];
  const campaigns = await db.campaign.findMany({
    where: { tenantId, id: { in: campaignIds } },
    select: { id: true, hectares: true },
  });
  if (campaigns.length !== new Set(campaignIds).size) notFound("Campaña no encontrada");
  const parts = splitByHectares(source.amount, campaigns);
  await db.costAllocation.createMany({
    data: parts.map((part) => ({
      tenantId,
      campaignId: part.id,
      expenseId: source.expenseId ?? null,
      stockMovementId: source.stockMovementId ?? null,
      amount: part.amount,
      currency: source.currency,
      date: source.date,
      concept: source.concept,
    })),
  });
  return parts;
}

/** Reemplaza las campañas a las que va un gasto (alta o edición desde la web). */
export async function setExpenseCampaigns(tenantId: string, expenseId: string, campaignIds: string[]) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, tenantId }, include: { category: true } });
  if (!expense) notFound("Gasto no encontrado");
  await prisma.$transaction(async (tx) => {
    await tx.costAllocation.deleteMany({ where: { tenantId, expenseId } });
    await allocateCost(tx, tenantId, campaignIds, {
      expenseId,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date,
      concept: expense.description || expense.category.name,
    });
  });
}

/** Campañas que pueden recibir costos (en curso o cosechadas), para los selectores de la web. */
export function listAssignableCampaigns(tenantId: string) {
  return prisma.campaign.findMany({
    where: { tenantId, status: { in: ["IN_PROGRESS", "HARVESTED"] } },
    select: { id: true, crop: true, season: true, hectares: true, pasture: { select: { name: true } } },
    orderBy: [{ season: "desc" }, { crop: "asc" }],
  });
}

/** Para cada gasto, a qué campañas está asignado. */
export async function expenseCampaignIds(tenantId: string): Promise<Record<string, string[]>> {
  const rows = await prisma.costAllocation.findMany({
    where: { tenantId, expenseId: { not: null } },
    select: { expenseId: true, campaignId: true },
  });
  const result: Record<string, string[]> = {};
  for (const row of rows) (result[row.expenseId!] ??= []).push(row.campaignId);
  return result;
}
