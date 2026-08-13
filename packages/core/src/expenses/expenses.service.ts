import "server-only";
import { prisma } from "@repo/database";
import { notFound } from "../errors";
import type { CreateExpenseInput, UpdateExpenseInput, ExpenseFilters } from "./expenses.schema";

const EXPENSE_INCLUDE = { category: true } as const;

function dateRangeWhere(filters: ExpenseFilters) {
  if (!filters.from && !filters.to) return undefined;
  return {
    gte: filters.from ? new Date(filters.from) : undefined,
    lte: filters.to ? new Date(filters.to) : undefined,
  };
}

export function listExpenses(tenantId: string, filters: ExpenseFilters = {}) {
  return prisma.expense.findMany({
    where: {
      tenantId,
      currency: filters.currency,
      date: dateRangeWhere(filters),
    },
    include: EXPENSE_INCLUDE,
    orderBy: { date: "desc" },
  });
}

export async function findExpense(tenantId: string, id: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, tenantId },
    include: EXPENSE_INCLUDE,
  });
  if (!expense) notFound("Gasto no encontrado");
  return expense;
}

/** El legacy no valida que categoryId pertenezca al tenant (confía solo en la FK,
 *  lo que permite vincular por error un gasto a la categoría de otro tenant). Se
 *  agrega esta verificación como red de seguridad -- no cambia el camino feliz. */
async function assertCategoryBelongsToTenant(tenantId: string, categoryId: string) {
  const category = await prisma.expenseCategory.findFirst({ where: { id: categoryId, tenantId } });
  if (!category) notFound("Categoría de gasto no encontrada");
}

export async function createExpense(tenantId: string, input: CreateExpenseInput) {
  await assertCategoryBelongsToTenant(tenantId, input.categoryId);
  return prisma.expense.create({
    data: {
      tenantId,
      categoryId: input.categoryId,
      amount: input.amount,
      currency: input.currency ?? "ARS",
      date: new Date(input.date),
      description: input.description,
      withIva: input.withIva ?? true,
    },
    include: EXPENSE_INCLUDE,
  });
}

export async function updateExpense(tenantId: string, id: string, input: UpdateExpenseInput) {
  await findExpense(tenantId, id);
  if (input.categoryId) {
    await assertCategoryBelongsToTenant(tenantId, input.categoryId);
  }
  return prisma.expense.update({
    where: { id },
    data: {
      categoryId: input.categoryId,
      amount: input.amount,
      currency: input.currency,
      date: input.date ? new Date(input.date) : undefined,
      description: input.description,
      withIva: input.withIva,
    },
    include: EXPENSE_INCLUDE,
  });
}

export async function deleteExpense(tenantId: string, id: string) {
  await findExpense(tenantId, id);
  await prisma.expense.delete({ where: { id } });
}

/** Puerto directo de `getDashboard` del legacy: `byCategory` siempre tiene una
 *  entrada por cada categoría existente (incluso en $0), `monthlyTrends` agrupa por
 *  "YYYY-MM" sin traducir a nombre de mes -- se replica tal cual en la UI. */
export async function getExpenseDashboard(tenantId: string, filters: ExpenseFilters = {}) {
  const [expenses, categories] = await Promise.all([
    listExpenses(tenantId, filters),
    prisma.expenseCategory.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
  ]);

  const byCategory = categories.map((cat) => {
    const catExpenses = expenses.filter((e) => e.categoryId === cat.id);
    return {
      categoryId: cat.id,
      name: cat.name,
      color: cat.color,
      total: catExpenses.reduce((sum, e) => sum + e.amount, 0),
      count: catExpenses.length,
    };
  });

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  const monthlyMap = new Map<string, number>();
  for (const e of expenses) {
    const month = e.date.toISOString().slice(0, 7);
    monthlyMap.set(month, (monthlyMap.get(month) ?? 0) + e.amount);
  }
  const monthlyTrends = Array.from(monthlyMap.entries())
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { totalAmount, byCategory, monthlyTrends, expenses };
}
