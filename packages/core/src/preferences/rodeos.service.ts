import "server-only";
import { z } from "zod";
import { prisma } from "@repo/database";
import { conflict, notFound } from "../errors";
import { isUniqueConstraintError } from "../prisma-errors";

export const rodeoSchema = z.object({
  name: z.string().trim().min(1, "Ingresá el nombre del rodeo").max(120),
  description: z.string().trim().max(500).optional(),
});
export type RodeoInput = z.infer<typeof rodeoSchema>;

export function listRodeos(tenantId: string) {
  return prisma.rodeo.findMany({ where: { tenantId }, orderBy: { name: "asc" } });
}

export async function createRodeo(tenantId: string, input: RodeoInput) {
  try {
    return await prisma.rodeo.create({
      data: { tenantId, name: input.name, description: input.description },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      conflict("Ya existe un rodeo con ese nombre.");
    }
    throw error;
  }
}

export async function updateRodeo(tenantId: string, id: string, input: RodeoInput) {
  const rodeo = await prisma.rodeo.findFirst({ where: { id, tenantId } });
  if (!rodeo) notFound("Rodeo no encontrado");
  try {
    return await prisma.rodeo.update({
      where: { id },
      data: { name: input.name, description: input.description },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      conflict("Ya existe un rodeo con ese nombre.");
    }
    throw error;
  }
}

export async function deleteRodeo(tenantId: string, id: string) {
  const rodeo = await prisma.rodeo.findFirst({ where: { id, tenantId } });
  if (!rodeo) notFound("Rodeo no encontrado");
  await prisma.rodeo.delete({ where: { id } });
}
