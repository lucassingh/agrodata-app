import "server-only";
import { z } from "zod";
import { prisma } from "@repo/database";
import { conflict, notFound } from "../errors";
import { isUniqueConstraintError } from "../prisma-errors";

export const createAnimalCategorySchema = z.object({
  name: z.string().trim().min(1, "Ingresá el nombre de la categoría").max(100),
});
export type CreateAnimalCategoryInput = z.infer<typeof createAnimalCategorySchema>;

export function listAnimalCategories(tenantId: string) {
  return prisma.animalCategory.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
}

export async function createAnimalCategory(
  tenantId: string,
  input: CreateAnimalCategoryInput,
) {
  try {
    return await prisma.animalCategory.create({
      data: { tenantId, name: input.name },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      conflict("Ya existe una categoría de animal con ese nombre.");
    }
    throw error;
  }
}

export async function deleteAnimalCategory(tenantId: string, id: string) {
  const category = await prisma.animalCategory.findFirst({ where: { id, tenantId } });
  if (!category) notFound("Categoría de animal no encontrada");
  await prisma.animalCategory.delete({ where: { id } });
}
