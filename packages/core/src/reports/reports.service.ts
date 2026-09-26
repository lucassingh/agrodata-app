import "server-only";
import { prisma } from "@repo/database";
import { LOW_STOCK_THRESHOLD } from "../supplies/stock-math";
import { dateOnlyRangeFilter, dateRangeFilter, type DateRange } from "./date-range";


/** Puerto directo de `ReportsService.dashboard()` del legacy: 15 queries en
 *  paralelo + 1 secuencial (categorías de gasto, para resolver nombre/color).
 *  Acepta un período (ver `dateRange`); sin período es la foto acumulada de todo
 *  el historial, como el legacy. No
 *  reusa `getExpenseDashboard` de Gastos a propósito: acá `expensesByCategory`
 *  se arma con un `groupBy` de Prisma que omite categorías en $0, mientras que
 *  el dashboard de Gastos sí las incluye -- son dos formas reales distintas en
 *  el legacy, no conviene unificarlas. */
export async function getDashboardSummary(tenantId: string, range: DateRange = {}) {
  // Lo que ocurre en el tiempo (registros, gastos, mortandad) respeta el período;
  // lo que es estado actual (animales, potreros, stock) no.
  const period = dateRangeFilter(range);
  const records = { tenantId, ...(period ? { occurredAt: period } : {}) };
  const expensePeriod = dateOnlyRangeFilter(range);
  const expenses = { tenantId, ...(expensePeriod ? { date: expensePeriod } : {}) };
  const deaths = { tenantId, type: "DEATH" as const, ...(period ? { date: period } : {}) };

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
    prisma.record.count({ where: records }),
    prisma.userTenantMembership.count({ where: { tenantId, status: "ACTIVE" } }),
    prisma.record.groupBy({ by: ["type"], where: records, _count: true }),
    prisma.pasture.count({ where: { tenantId } }),
    prisma.task.count({ where: { tenantId } }),
    prisma.task.count({ where: { tenantId, status: "PENDING" } }),
    // Pesos y dólares no se suman (todavía no hay tipo de cambio): el total y la
    // torta van en pesos y los dólares se informan aparte.
    prisma.expense.aggregate({ where: { ...expenses, currency: "ARS" }, _sum: { amount: true } }),
    prisma.supply.count({ where: { tenantId } }),
    prisma.record.findMany({ where: records, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.pasture.aggregate({ where: { tenantId }, _sum: { hectares: true } }),
    prisma.pastureAnimal.aggregate({ where: { pasture: { tenantId } }, _sum: { quantity: true } }),
    prisma.pastureAnimal.groupBy({
      by: ["animalType"],
      where: { pasture: { tenantId } },
      _sum: { quantity: true },
    }),
    prisma.pastureCrop.groupBy({ by: ["crop"], where: { pasture: { tenantId } }, _count: true }),
    prisma.expense.groupBy({ by: ["categoryId"], where: { ...expenses, currency: "ARS" }, _sum: { amount: true }, _count: true }),
    prisma.supply.findMany({
      where: { tenantId, quantity: { lte: LOW_STOCK_THRESHOLD } },
      include: { category: true },
      take: 10,
      orderBy: { quantity: "asc" },
    }),
    prisma.expenseCategory.findMany({ where: { tenantId } }),
    prisma.livestockEvent.aggregate({ where: deaths, _sum: { quantity: true } }),
    prisma.expense.aggregate({ where: { ...expenses, currency: "USD" }, _sum: { amount: true } }),
  ]);

  // Sanidad pendiente que vence en los próximos 30 días (o ya venció). No depende del período.
  const dueUntil = new Date();
  dueUntil.setUTCDate(dueUntil.getUTCDate() + 30);
  const sanitaryDue = await prisma.task.findMany({
    where: { tenantId, type: "TRATAMIENTO_SANITARIO", status: "PENDING", deadline: { lte: dueUntil } },
    orderBy: { deadline: "asc" },
    take: 5,
  });

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
    sanitaryDue: sanitaryDue.map((t) => ({
      id: t.id,
      name: t.treatment ?? t.description ?? "Tratamiento sanitario",
      day: t.deadline.toISOString().slice(0, 10),
    })),
  };
}

export type DashboardSummary = Awaited<ReturnType<typeof getDashboardSummary>>;
