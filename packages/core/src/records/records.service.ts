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
