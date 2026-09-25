import "server-only";
import { prisma } from "@repo/database";
import { createExpense } from "../expenses/expenses.service";
import { findByNormalizedName } from "./entity-name";
import { buildExpenseInput, formatMoney, isExpenseEvent, newCategoryQuestion, type ExpenseEventData } from "./expense-event";

/** Nombre que se propone si Claude no sugirió ninguna categoría (no debería
 *  pasar: el prompt le pide siempre una cuando hay monto). */
const FALLBACK_CATEGORY_NAME = "Varios";

export type ExpensePlan =
  | { kind: "none" }
  | { kind: "ready"; categoryId: string; categoryName: string }
  | { kind: "needs-new-category"; categoryName: string; question: string };

/** Nombres de las categorías de gasto del campo, para que Claude elija una. */
export async function listExpenseCategoryNames(tenantId: string): Promise<string[]> {
  const categories = await prisma.expenseCategory.findMany({
    where: { tenantId },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  return categories.map((category) => category.name);
}

/** Decide qué hacer con el efecto "plata" de un mensaje: nada (no es un gasto
 *  o no tiene monto), cargarlo en una categoría existente, o preguntar antes
 *  de crear una categoría nueva. No escribe nada en la base. */
export async function planExpenseEffect(tenantId: string, event: ExpenseEventData): Promise<ExpensePlan> {
  if (!isExpenseEvent(event)) return { kind: "none" };

  const categoryName = event.categoria?.trim() || FALLBACK_CATEGORY_NAME;
  const categories = await prisma.expenseCategory.findMany({ where: { tenantId }, select: { id: true, name: true } });
  const match = findByNormalizedName(categories, categoryName);

  if (match) return { kind: "ready", categoryId: match.id, categoryName: match.name };
  return { kind: "needs-new-category", categoryName, question: newCategoryQuestion(event, categoryName) };
}

/** Carga el gasto en una categoría que ya existe. Devuelve el texto de
 *  confirmación para mandar por WhatsApp. */
export async function applyExpenseEffect(
  tenantId: string,
  event: ExpenseEventData,
  category: { id: string; name: string },
): Promise<string> {
  const input = buildExpenseInput(event, category.id);
  await createExpense(tenantId, input);
  return `✅ Registrado: ${event.summary}. Cargué el gasto de ${formatMoney(input.amount, input.currency ?? "ARS")} en «${category.name}».`;
}
