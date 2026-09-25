import "server-only";
import { prisma } from "@repo/database";

const LOW_STOCK_THRESHOLD = 5;

/** Puerto directo de `ReportsService.dashboard()` del legacy: 15 queries en
 *  paralelo + 1 secuencial (categorías de gasto, para resolver nombre/color).
 *  Sin filtro de fecha en ninguna -- es una foto acumulada de todo el historial,
 *  igual que el legacy (no existe "este mes" ni rango en esta pantalla). No
 *  reusa `getExpenseDashboard` de Gastos a propósito: acá `expensesByCategory`
 *  se arma con un `groupBy` de Prisma que omite categorías en $0, mientras que
 *  el dashboard de Gastos sí las incluye -- son dos formas reales distintas en
 *  el legacy, no conviene unificarlas. */
export async function getDashboardSummary(tenantId: string) {
  const [
    totalRecords,
    totalUsers,
    recordsByTypeRaw,
    totalPastures,
    totalTasks,
    pendingTasks,
    expensesAgg,
    totalSupplies,
    recentRecords,
    hectaresAgg,
    animalsAgg,
    animalsByTypeRaw,
    cropSummaryRaw,
    expensesByCategoryRaw,
    supplyAlerts,
    expenseCategories,
    deathsAgg,
    usdExpensesAgg,
  ] = await Promise.all([
    prisma.record.count({ where: { tenantId } }),
    prisma.userTenantMembership.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.record.groupBy({ by: ["type"], where: { tenantId }, _count: true }),
    prisma.pasture.count({ where: { tenantId } }),
    prisma.task.count({ where: { tenantId } }),
    prisma.task.count({ where: { tenantId, status: "PENDING" } }),
    // Pesos y dólares no se suman (todavía no hay tipo de cambio): el total y la
    // torta van en pesos y los dólares se informan aparte.
    prisma.expense.aggregate({ where: { tenantId, currency: "ARS" }, _sum: { amount: true } }),
    prisma.supply.count({ where: { tenantId } }),
    prisma.record.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.pasture.aggregate({ where: { tenantId }, _sum: { hectares: true } }),
    prisma.pastureAnimal.aggregate({ where: { pasture: { tenantId } }, _sum: { quantity: true } }),
    prisma.pastureAnimal.groupBy({
      by: ["animalType"],
      where: { pasture: { tenantId } },
      _sum: { quantity: true },
    }),
    prisma.pastureCrop.groupBy({ by: ["crop"], where: { pasture: { tenantId } }, _count: true }),
    prisma.expense.groupBy({ by: ["categoryId"], where: { tenantId, currency: "ARS" }, _sum: { amount: true }, _count: true }),
    prisma.supply.findMany({
      where: { tenantId, quantity: { lte: LOW_STOCK_THRESHOLD } },
      include: { category: true },
      take: 10,
      orderBy: { quantity: "asc" },
    }),
    prisma.expenseCategory.findMany({ where: { tenantId } }),
    prisma.livestockEvent.aggregate({ where: { tenantId, type: "DEATH" }, _sum: { quantity: true } }),
    prisma.expense.aggregate({ where: { tenantId, currency: "USD" }, _sum: { amount: true } }),
  ]);

  const categoryMap = new Map(expenseCategories.map((c) => [c.id, c]));
  const expensesByCategory = expensesByCategoryRaw.map((e) => ({
    categoryId: e.categoryId,
    name: categoryMap.get(e.categoryId)?.name ?? "Sin categoría",
    color: categoryMap.get(e.categoryId)?.color ?? "#888",
    total: e._sum.amount ?? 0,
    count: e._count,
  }));

  const purchases = recordsByTypeRaw.find((r) => r.type === "PURCHASE");
  const sales = recordsByTypeRaw.find((r) => r.type === "SALE");

  return {
    tenantId,
    kpis: {
      animales: animalsAgg._sum.quantity ?? 0,
      // `lluvia`: constante en 0 heredada del legacy -- todavía no hay dónde
      // registrar lluvias. `mortandad`: cabezas muertas registradas (movimientos
      // de hacienda de tipo DEATH, cargados por WhatsApp).
      lluvia: 0,
      mortandad: deathsAgg._sum.quantity ?? 0,
      ventas: sales?._count ?? 0,
      compras: purchases?._count ?? 0,
      datosIngresados: totalRecords,
    },
    totalPastures,
    totalTasks,
    pendingTasks,
    totalExpenses: expensesAgg._sum.amount ?? 0,
    totalExpensesUsd: usdExpensesAgg._sum.amount ?? 0,
    totalSupplies,
    totalUsers,
    recordsByType: recordsByTypeRaw.map((r) => ({ type: r.type, count: r._count })),
    recentRecords,
    totalHectares: hectaresAgg._sum.hectares ?? 0,
    totalAnimals: animalsAgg._sum.quantity ?? 0,
    animalsByType: animalsByTypeRaw.map((a) => ({ type: a.animalType, count: a._sum.quantity ?? 0 })),
    cropSummary: cropSummaryRaw.map((c) => ({ name: c.crop, count: c._count })),
    expensesByCategory,
    supplyAlerts,
  };
}

export type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;
