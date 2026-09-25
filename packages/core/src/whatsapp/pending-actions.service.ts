import "server-only";
import { prisma, type Prisma } from "@repo/database";
import { applyMessagePlan } from "./apply-plan.service";
import { planMessageEffects, resultMessage } from "./plan-effects";
import { isPendingActionExpired, PENDING_ACTION_TTL_MS, pendingActionSchema, type PendingAction } from "./pending-actions";
import { loadTenantCatalog } from "./tenant-catalog.service";

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

/** Ejecuta la acción que el productor confirmó y la consume. Se vuelve a
 *  planificar contra el catálogo actual (algo pudo cambiar desde la pregunta).
 *  Es seguro reintentarla: `applyMessagePlan` no re-aplica un plan ya anotado
 *  en el registro. Devuelve el texto de confirmación para WhatsApp. */
export async function executePendingAction(pending: StoredPendingAction): Promise<string> {
  const { action } = pending;
  switch (action.actionType) {
    case "APPLY_MESSAGE_PLAN": {
      const { event, recordId } = action.payload;
      const plan = planMessageEffects(event, await loadTenantCatalog(pending.tenantId));
      const result = await applyMessagePlan({ tenantId: pending.tenantId, userId: pending.userId, recordId, plan });
      await discardPendingAction(pending.id);
      return resultMessage(event.summary, result.lines, plan.notes);
    }
  }
}
