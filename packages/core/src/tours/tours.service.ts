import "server-only";
import { prisma } from "@repo/database";

/** Las guías que la persona ya terminó o cerró (Etapa 6.4). */
export async function listSeenTours(userId: string): Promise<string[]> {
  const rows = await prisma.tourSeen.findMany({ where: { userId }, select: { tourId: true } });
  return rows.map((row) => row.tourId);
}

/** Marca una guía como vista. Idempotente: verla dos veces no duplica nada. */
export async function markTourSeen(userId: string, tourId: string): Promise<void> {
  await prisma.tourSeen.createMany({ data: [{ userId, tourId }], skipDuplicates: true });
}
