import "server-only";
import { prisma, type Prisma } from "@repo/database";
import { notFound } from "../errors";
import type { CreateRecordInput, UpdateRecordInput } from "./records.schema";

export function createRecord(tenantId: string, input: CreateRecordInput) {
  return prisma.record.create({
    data: {
      tenantId,
      type: input.type,
      occurredAt: new Date(input.occurredAt),
      data: input.data as Prisma.InputJsonValue,
      source: input.source,
      userId: input.userId,
      rawMessage: input.rawMessage,
    },
  });
}

/** Puerto directo de `findByTenantForUser` del legacy: `take: 100`, sin cursor ni
 *  total -- si el tenant tiene más de 100 registros, el resto queda invisible sin
 *  ningún indicador en la UI. Gap real del legacy, replicado a propósito. */
export function listRecordsForUser(tenantId: string) {
  return prisma.record.findMany({
    where: { tenantId },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });
}

async function findRecord(tenantId: string, id: string) {
  const record = await prisma.record.findFirst({ where: { id, tenantId } });
  if (!record) notFound("Registro no encontrado");
  return record;
}

/** La fecha editada se guarda al mediodía de Argentina para que no se corra de
 *  día al mostrarla en otro huso horario. */
export async function updateRecord(tenantId: string, id: string, input: UpdateRecordInput) {
  const record = await findRecord(tenantId, id);
  const data = (record.data ?? {}) as Record<string, unknown>;
  return prisma.record.update({
    where: { id },
    data: {
      occurredAt: new Date(`${input.occurredAt}T12:00:00-03:00`),
      data: { ...data, summary: input.summary } as Prisma.InputJsonValue,
    },
  });
}

/** Borra el registro del historial. No deshace lo que el mensaje ya cargó en
 *  otros módulos: eso se corrige en cada uno. */
export async function deleteRecord(tenantId: string, id: string) {
  await findRecord(tenantId, id);
  await prisma.record.delete({ where: { id } });
}
