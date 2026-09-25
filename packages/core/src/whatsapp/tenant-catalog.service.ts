import "server-only";
import { prisma } from "@repo/database";
import type { TenantCatalog } from "./plan-effects";

/** Todo lo que el planificador de efectos necesita saber del campo, en una sola
 *  lectura. Es JSON serializable a propósito: viaja entre pasos de Inngest. */
export async function loadTenantCatalog(tenantId: string): Promise<TenantCatalog> {
  const [expenseCategories, supplyCategories, supplies, pastures, animalCategories, campaigns] = await Promise.all([
    prisma.expenseCategory.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.supplyCategory.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.supply.findMany({
      where: { tenantId },
      select: { id: true, name: true, unit: true, quantity: true, categoryId: true },
      orderBy: { name: "asc" },
    }),
    prisma.pasture.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        hectares: true,
        crops: { select: { id: true, crop: true } },
        animals: { select: { id: true, animalType: true, quantity: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.animalCategory.findMany({ where: { tenantId }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.campaign.findMany({
      where: { tenantId, status: { in: ["IN_PROGRESS", "HARVESTED"] } },
      select: { id: true, pastureId: true, crop: true, season: true, status: true, hectares: true },
      orderBy: { sowingDate: "desc" },
    }),
  ]);

  return { expenseCategories, supplyCategories, supplies, pastures, animalCategories, campaigns };
}
