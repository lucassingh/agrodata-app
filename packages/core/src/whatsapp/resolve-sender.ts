import "server-only";
import { prisma } from "@repo/database";
import { normalizeArgWNumber } from "../memberships/invite-identifier.util";

export interface ResolvedSender {
  userId: string;
  userName: string;
  activeTenantId: string | null;
}

/** Resuelve el `wa_id` que manda Meta (formato variable: con o sin el 9 de
 *  Argentina según el contexto) al `User` registrado, reusando el mismo
 *  normalizador que ya usa el flujo de invitaciones del equipo -- no se
 *  duplica lógica de parseo de números argentinos. Devuelve `null` (nunca
 *  tira excepción) si el número no normaliza o no hay ningún `User` con ese
 *  `wNumber`, para que el caller decida qué responderle a un número no
 *  registrado sin que se caiga el procesamiento del webhook. */
export async function resolveSenderByWaId(waId: string): Promise<ResolvedSender | null> {
  let wNumber: string;
  try {
    wNumber = normalizeArgWNumber(waId.startsWith("+") ? waId : `+${waId}`);
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { wNumber } });
  if (!user) return null;

  return {
    userId: user.id,
    userName: `${user.name} ${user.lastname}`.trim(),
    activeTenantId: user.activeTenantId,
  };
}
