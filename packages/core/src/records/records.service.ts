import "server-only";
import { prisma, type Prisma } from "@repo/database";
import type { CreateRecordInput } from "./records.schema";

export function createRecord(tenantId: string, input: CreateRecordInput) {
  return prisma.record.create({
    data: {
      tenantId,
      type: input.type,
      occurredAt: new Date(input.occurredAt),
      data: input.data as Prisma.InputJsonValue,
      source: input.source,
      userId: input.userId,
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
