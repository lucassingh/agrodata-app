import "server-only";
import { z } from "zod";
import { prisma } from "@repo/database";
import { conflict, notFound } from "../errors";
import { isUniqueConstraintError } from "../prisma-errors";

export const createExpenseCategorySchema = z.object({
  name: z.string().trim().min(1, "Ingresá el nombre de la categoría").max(100),
  color: z.string().trim().max(20).optional(),
});
export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;

export function listExpenseCategories(tenantId: string) {
  return prisma.expenseCategory.findMany({
    where: { tenantId },
    include: { expenses: { select: { amount: true, currency: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createExpenseCategory(
  tenantId: string,
  input: CreateExpenseCategoryInput,
) {
  try {
    return await prisma.expenseCategory.create({
      data: { tenantId, name: input.name, color: input.color },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      conflict("Ya existe una categoría de gasto con ese nombre.");
    }
    throw error;
  }
}

export async function deleteExpenseCategory(tenantId: string, id: string) {
  const category = await prisma.expenseCategory.findFirst({ where: { id, tenantId } });
  if (!category) notFound("Categoría no encontrada");
  // onDelete: Cascade en el schema -- borra tambien los Expense de esta categoria,
  // igual que el legacy (ver CLAUDE.md / reporte de migracion).
  await prisma.expenseCategory.delete({ where: { id } });
}
