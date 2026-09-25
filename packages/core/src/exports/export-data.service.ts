import "server-only";
import { prisma } from "@repo/database";

/** Lecturas completas de un campo para exportar a Excel. Sin paginar: una
 *  planilla lleva todo el historial (con un tope de seguridad). */
const EXPORT_LIMIT = 20_000;

export function listTenantStockMovements(tenantId: string) {
  return prisma.stockMovement.findMany({
    where: { tenantId },
    include: { supply: { select: { name: true, unit: true } }, pasture: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: EXPORT_LIMIT,
  });
}

export function listTenantLivestockEvents(tenantId: string) {
  return prisma.livestockEvent.findMany({
    where: { tenantId },
    include: { pasture: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: EXPORT_LIMIT,
  });
}

/** Historial de Datos con el nombre de quien cargó cada registro. */
export async function listTenantRecordsWithAuthor(tenantId: string) {
  const records = await prisma.record.findMany({
    where: { tenantId },
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: EXPORT_LIMIT,
  });
  const userIds = [...new Set(records.map((r) => r.userId).filter((id): id is string => Boolean(id)))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, lastname: true },
  });
  const names = new Map(users.map((u) => [u.id, [u.name, u.lastname].filter(Boolean).join(" ")]));
  return records.map((record) => ({ ...record, authorName: record.userId ? (names.get(record.userId) ?? null) : null }));
}
