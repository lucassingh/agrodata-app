import "server-only";
import { prisma } from "@repo/database";

export async function getAllPreferences(tenantId: string) {
  const [animalCategories, rodeos, cropConfigs, supplyCategories] = await Promise.all([
    prisma.animalCategory.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.rodeo.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.cropConfig.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
    prisma.supplyCategory.findMany({ where: { tenantId }, orderBy: { name: "asc" } }),
  ]);
  return { animalCategories, rodeos, cropConfigs, supplyCategories };
}
