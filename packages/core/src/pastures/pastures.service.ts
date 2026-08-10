import "server-only";
import { prisma } from "@repo/database";
import { notFound } from "../errors";
import type { CreatePastureInput, UpdatePastureInput } from "./pastures.schema";

const PASTURE_INCLUDE = { crops: true, animals: true } as const;

export function listPastures(tenantId: string) {
  return prisma.pasture.findMany({
    where: { tenantId },
    include: PASTURE_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function findPasture(tenantId: string, id: string) {
  const pasture = await prisma.pasture.findFirst({
    where: { id, tenantId },
    include: PASTURE_INCLUDE,
  });
  if (!pasture) notFound("Potrero no encontrado");
  return pasture;
}

function cropsCreateData(crops: CreatePastureInput["crops"]) {
  return (crops ?? []).map((c) => ({
    crop: c.crop,
    hectares: c.hectares,
    startDate: c.startDate ? new Date(c.startDate) : undefined,
  }));
}

export async function createPasture(tenantId: string, input: CreatePastureInput) {
  return prisma.pasture.create({
    data: {
      tenantId,
      name: input.name,
      hectares: input.hectares,
      crops: input.crops?.length ? { createMany: { data: cropsCreateData(input.crops) } } : undefined,
      animals: input.animals?.length ? { createMany: { data: input.animals } } : undefined,
    },
    include: PASTURE_INCLUDE,
  });
}

/** El legacy no envuelve esto en transacción -- loop secuencial, falla
 *  parcial posible (algunos potreros creados, otros no). Se replica igual. */
export async function createPasturesBulk(tenantId: string, items: CreatePastureInput[]) {
  const created = [];
  for (const item of items) {
    created.push(await createPasture(tenantId, item));
  }
  return created;
}

export async function updatePasture(
  tenantId: string,
  id: string,
  input: UpdatePastureInput,
) {
  await findPasture(tenantId, id);

  await prisma.$transaction(async (tx) => {
    if (input.crops !== undefined) {
      await tx.pastureCrop.deleteMany({ where: { pastureId: id } });
      if (input.crops.length) {
        await tx.pastureCrop.createMany({
          data: cropsCreateData(input.crops).map((c) => ({ ...c, pastureId: id })),
        });
      }
    }
    if (input.animals !== undefined) {
      await tx.pastureAnimal.deleteMany({ where: { pastureId: id } });
      if (input.animals.length) {
        await tx.pastureAnimal.createMany({
          data: input.animals.map((a) => ({ ...a, pastureId: id })),
        });
      }
    }
    await tx.pasture.update({
      where: { id },
      data: { name: input.name, hectares: input.hectares },
    });
  });

  return findPasture(tenantId, id);
}

export async function deletePasture(tenantId: string, id: string) {
  await findPasture(tenantId, id);
  await prisma.pasture.delete({ where: { id } });
}
