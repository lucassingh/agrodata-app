import "server-only";
import { prisma } from "@repo/database";
import { notFound } from "../errors";
import type { CreateTaskInput, UpdateTaskInput } from "./tasks.schema";

const TASK_INCLUDE = {
  products: true,
  pastures: { include: { pasture: true } },
  animals: true,
  fertilizers: true,
  responsible: { select: { id: true, name: true, lastname: true } },
} as const;

export function listTasks(tenantId: string, status?: "PENDING" | "COMPLETED") {
  return prisma.task.findMany({
    where: status ? { tenantId, status } : { tenantId },
    include: TASK_INCLUDE,
    orderBy: { deadline: "asc" },
  });
}

export async function findTask(tenantId: string, id: string) {
  const task = await prisma.task.findFirst({ where: { id, tenantId }, include: TASK_INCLUDE });
  if (!task) notFound("Tarea no encontrada");
  return task;
}

/** El legacy no valida que pastureId/responsibleId pertenezcan al tenant (confía
 *  en que la UI solo ofrece opciones del tenant activo). Se agrega esta
 *  verificación como red de seguridad -- no cambia el camino feliz. */
async function assertPastureBelongsToTenant(tenantId: string, pastureId: string) {
  const pasture = await prisma.pasture.findFirst({ where: { id: pastureId, tenantId } });
  if (!pasture) notFound("Potrero no encontrado");
}

async function assertResponsibleBelongsToTenant(tenantId: string, userId: string) {
  const membership = await prisma.userTenantMembership.findFirst({
    where: { tenantId, userId, status: "ACTIVE" },
  });
  if (!membership) notFound("Responsable no encontrado en el equipo del campo");
}

async function assertReferencesValid(
  tenantId: string,
  input: { responsibleId?: string; pastures?: { pastureId: string }[] },
) {
  if (input.responsibleId) {
    await assertResponsibleBelongsToTenant(tenantId, input.responsibleId);
  }
  if (input.pastures?.length) {
    await Promise.all(input.pastures.map((p) => assertPastureBelongsToTenant(tenantId, p.pastureId)));
  }
}

export async function createTask(tenantId: string, input: CreateTaskInput) {
  await assertReferencesValid(tenantId, input);
  return prisma.task.create({
    data: {
      tenantId,
      type: input.type,
      deadline: new Date(input.deadline),
      treatment: input.treatment,
      crop: input.crop,
      genetic: input.genetic,
      spacing: input.spacing,
      density: input.density,
      densityUnit: input.densityUnit,
      contractor: input.contractor,
      description: input.description,
      responsibleId: input.responsibleId,
      products: input.products?.length ? { createMany: { data: input.products } } : undefined,
      pastures: input.pastures?.length
        ? {
            createMany: {
              data: input.pastures.map((p) => ({ pastureId: p.pastureId, hectares: p.hectares })),
            },
          }
        : undefined,
      animals: input.animals?.length ? { createMany: { data: input.animals } } : undefined,
      fertilizers: input.fertilizers?.length ? { createMany: { data: input.fertilizers } } : undefined,
    },
    include: TASK_INCLUDE,
  });
}

/** Replace-all por sub-entidad, igual que Potreros: si la key viene en el
 *  payload se borran todas las filas existentes y se recrean con la lista nueva. */
export async function updateTask(tenantId: string, id: string, input: UpdateTaskInput) {
  await findTask(tenantId, id);
  await assertReferencesValid(tenantId, input);

  await prisma.$transaction(async (tx) => {
    if (input.products !== undefined) {
      await tx.taskProduct.deleteMany({ where: { taskId: id } });
      if (input.products.length) {
        await tx.taskProduct.createMany({ data: input.products.map((p) => ({ ...p, taskId: id })) });
      }
    }
    if (input.pastures !== undefined) {
      await tx.taskPasture.deleteMany({ where: { taskId: id } });
      if (input.pastures.length) {
        await tx.taskPasture.createMany({
          data: input.pastures.map((p) => ({ pastureId: p.pastureId, hectares: p.hectares, taskId: id })),
        });
      }
    }
    if (input.animals !== undefined) {
      await tx.taskAnimal.deleteMany({ where: { taskId: id } });
      if (input.animals.length) {
        await tx.taskAnimal.createMany({ data: input.animals.map((a) => ({ ...a, taskId: id })) });
      }
    }
    if (input.fertilizers !== undefined) {
      await tx.taskFertilizer.deleteMany({ where: { taskId: id } });
      if (input.fertilizers.length) {
        await tx.taskFertilizer.createMany({ data: input.fertilizers.map((f) => ({ ...f, taskId: id })) });
      }
    }
    await tx.task.update({
      where: { id },
      data: {
        status: input.status,
        deadline: input.deadline ? new Date(input.deadline) : undefined,
        treatment: input.treatment,
        crop: input.crop,
        genetic: input.genetic,
        spacing: input.spacing,
        density: input.density,
        densityUnit: input.densityUnit,
        contractor: input.contractor,
        description: input.description,
        responsibleId: input.responsibleId,
      },
    });
  });

  return findTask(tenantId, id);
}

export async function toggleTaskStatus(tenantId: string, id: string) {
  const task = await findTask(tenantId, id);
  const nextStatus = task.status === "PENDING" ? "COMPLETED" : "PENDING";
  await prisma.task.update({ where: { id }, data: { status: nextStatus } });
  return findTask(tenantId, id);
}

export async function deleteTask(tenantId: string, id: string) {
  await findTask(tenantId, id);
  await prisma.task.delete({ where: { id } });
}
