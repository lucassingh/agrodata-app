import "server-only";
import { z } from "zod";
import { prisma } from "@repo/database";
import { conflict, notFound } from "../errors";
import { isUniqueConstraintError } from "../prisma-errors";

export const createCropConfigSchema = z.object({
  name: z.string().trim().min(1, "Ingresá el nombre del cultivo").max(100),
});
export type CreateCropConfigInput = z.infer<typeof createCropConfigSchema>;

export function listCropConfigs(tenantId: string) {
  return prisma.cropConfig.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
}

export async function createCropConfig(tenantId: string, input: CreateCropConfigInput) {
  try {
    return await prisma.cropConfig.create({ data: { tenantId, name: input.name } });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      conflict("Ya existe un cultivo con ese nombre.");
    }
    throw error;
  }
}

export async function deleteCropConfig(tenantId: string, id: string) {
  const crop = await prisma.cropConfig.findFirst({ where: { id, tenantId } });
  if (!crop) notFound("Cultivo no encontrado");
  await prisma.cropConfig.delete({ where: { id } });
}
