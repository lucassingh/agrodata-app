import "server-only";
import { z } from "zod";
import { prisma } from "@repo/database";
import { conflict, notFound } from "../errors";
import { isForeignKeyRestrictError, isUniqueConstraintError } from "../prisma-errors";

export const createSupplyCategorySchema = z.object({
  name: z.string().trim().min(1, "Ingresá el nombre de la categoría").max(100),
  code: z.string().trim().max(20).optional(),
});
export type CreateSupplyCategoryInput = z.infer<typeof createSupplyCategorySchema>;

export function listSupplyCategories(tenantId: string) {
  return prisma.supplyCategory.findMany({
    where: { tenantId },
    orderBy: { name: "asc" },
  });
}

export async function createSupplyCategory(
  tenantId: string,
  input: CreateSupplyCategoryInput,
) {
  try {
    return await prisma.supplyCategory.create({
      data: { tenantId, name: input.name, code: input.code },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      conflict("Ya existe una categoría de insumo con ese nombre.");
    }
    throw error;
  }
}

export async function deleteSupplyCategory(tenantId: string, id: string) {
  const category = await prisma.supplyCategory.findFirst({ where: { id, tenantId } });
  if (!category) notFound("Categoría de insumo no encontrada");
  try {
    await prisma.supplyCategory.delete({ where: { id } });
  } catch (error) {
    if (isForeignKeyRestrictError(error)) {
      conflict(
        "No se puede eliminar: todavía hay insumos que usan esta categoría.",
      );
    }
    throw error;
  }
}
