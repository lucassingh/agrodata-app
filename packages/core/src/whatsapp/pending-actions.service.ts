import "server-only";
import { prisma, type Prisma } from "@repo/database";
import { expenseCreateData } from "../expenses/expenses.service";
import { buildExpenseInput, formatMoney } from "./expense-event";
import { findByNormalizedName } from "./entity-name";
import { isPendingActionExpired, PENDING_ACTION_TTL_MS, pendingActionSchema, type PendingAction } from "./pending-actions";

export interface StoredPendingAction {
  id: string;
  tenantId: string;
  userId: string;
  waId: string;
  question: string;
  action: PendingAction;
}

/** Devuelve la acción pendiente vigente de un número, o null. Si está vencida
 *  o su payload no valida (ej. quedó de una versión anterior del código), la
 *  borra y devuelve null: nunca se ejecuta algo dudoso. */
export async function getActivePendingAction(waId: string): Promise<StoredPendingAction | null> {
  const row = await prisma.pendingWhatsAppAction.findUnique({ where: { waId } });
  if (!row) return null;

  const parsed = pendingActionSchema.safeParse({ actionType: row.actionType, payload: row.payload });
  if (isPendingActionExpired(row.expiresAt) || !parsed.success) {
    await prisma.pendingWhatsAppAction.deleteMany({ where: { id: row.id } });
    return null;
  }

  return {
    id: row.id,
    tenantId: row.tenantId,
    userId: row.userId,
    waId: row.waId,
    question: row.question,
    action: parsed.data,
  };
}

/** Guarda la acción que espera respuesta. Un número tiene como máximo una:
 *  si ya había otra, la reemplaza (`waId` es único). */
export async function savePendingAction(input: {
  tenantId: string;
  userId: string;
  waId: string;
  question: string;
  action: PendingAction;
}) {
  const action = pendingActionSchema.parse(input.action);
  const data = {
    tenantId: input.tenantId,
    userId: input.userId,
    actionType: action.actionType,
    payload: action.payload as Prisma.InputJsonValue,
    question: input.question,
    expiresAt: new Date(Date.now() + PENDING_ACTION_TTL_MS),
  };
  await prisma.pendingWhatsAppAction.upsert({
    where: { waId: input.waId },
    create: { waId: input.waId, ...data },
    update: { ...data, createdAt: new Date() },
  });
}

export async function discardPendingAction(id: string) {
  await prisma.pendingWhatsAppAction.deleteMany({ where: { id } });
}

/** Ejecuta la acción confirmada por el productor y la borra, todo en una sola
 *  transacción: si algo falla no queda ni el dato a medias ni la acción
 *  consumida, y un reintento no puede duplicar el gasto (la acción ya no
 *  existe). Devuelve el texto de confirmación para mandar por WhatsApp. */
export async function executePendingAction(pending: StoredPendingAction): Promise<string> {
  const { action } = pending;
  switch (action.actionType) {
    case "CREATE_EXPENSE_WITH_NEW_CATEGORY": {
      const { categoryName, expense } = action.payload;
      return prisma.$transaction(async (tx) => {
        const consumed = await tx.pendingWhatsAppAction.deleteMany({ where: { id: pending.id } });
        if (consumed.count === 0) {
          throw new Error("La acción pendiente ya no existe (¿se ejecutó en otro intento?)");
        }

        // Si mientras tanto alguien creó la categoría desde el dashboard, se usa esa.
        const categories = await tx.expenseCategory.findMany({ where: { tenantId: pending.tenantId } });
        const category =
          findByNormalizedName(categories, categoryName) ??
          (await tx.expenseCategory.create({ data: { tenantId: pending.tenantId, name: categoryName } }));

        const input = buildExpenseInput(expense, category.id);
        await tx.expense.create({ data: expenseCreateData(pending.tenantId, input) });

        return `✅ Listo: creé la categoría «${category.name}» y cargué el gasto de ${formatMoney(input.amount, input.currency ?? "ARS")}.`;
      });
    }
  }
}
