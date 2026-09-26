import "server-only";
import { prisma } from "@repo/database";
import { forbidden, notFound } from "../errors";
import type { CreateTenantInput, UpdateTenantInput } from "./tenants.schema";
import { activitiesFromCategory, categoryFromActivities, type FarmActivity, type TenantCategoryCode } from "./tenant-labels";

/** Editar o dar de baja un campo es del dueño. */
async function assertTenantAdmin(userId: string, tenantId: string, action: string) {
  const membership = await prisma.userTenantMembership.findFirst({
    where: { userId, tenantId, status: "ACTIVE" },
  });
  if (!membership) notFound("Campo no encontrado");
  if (membership.role !== "OWNER") {
    forbidden(`Solo el dueño puede ${action} este campo`);
  }
}

export async function listMyTenants(userId: string) {
  const memberships = await prisma.userTenantMembership.findMany({
    where: { userId, status: "ACTIVE" },
    include: { tenant: true },
    orderBy: { createdAt: "desc" },
  });
  return memberships.map((m) => ({ ...m.tenant, myRole: m.role }));
}

export async function findTenantForUser(userId: string, tenantId: string) {
  const membership = await prisma.userTenantMembership.findFirst({
    where: { userId, tenantId, status: "ACTIVE" },
    include: { tenant: true },
  });
  if (!membership) notFound("Campo no encontrado");
  return { ...membership.tenant, myRole: membership.role };
}

/** Actividades y rubro van juntos: el rubro (legacy) se deriva de las actividades. */
function withActivities<T extends { activities?: FarmActivity[]; category?: TenantCategoryCode }>(input: T) {
  if (input.activities) return { ...input, category: categoryFromActivities(input.activities) };
  if (input.category) return { ...input, activities: activitiesFromCategory(input.category) };
  return input;
}

/** Alta: sin actividades ni rubro, Mixto con las tres (el default de la base). */
function newTenantData(input: CreateTenantInput) {
  const data = withActivities(input);
  return data.activities ? data : { ...data, category: "MIXTO" as const, activities: activitiesFromCategory("MIXTO") };
}

export async function createTenantForUser(userId: string, input: CreateTenantInput) {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: newTenantData(input) });
    await tx.userTenantMembership.create({
      data: {
        userId,
        tenantId: tenant.id,
        // Quien crea el campo es su dueño (un asesor puede pasarle la titularidad al productor).
        role: "OWNER",
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { activeTenantId: tenant.id },
    });
    return { ...tenant, myRole: "OWNER" as const };
  });
}

export async function updateTenant(
  userId: string,
  tenantId: string,
  input: UpdateTenantInput,
) {
  await assertTenantAdmin(userId, tenantId, "editar");
  return prisma.tenant.update({ where: { id: tenantId }, data: withActivities(input) });
}

export async function deleteTenant(userId: string, tenantId: string) {
  await assertTenantAdmin(userId, tenantId, "eliminar");
  await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { activeTenantId: tenantId },
      data: { activeTenantId: null },
    });
    await tx.tenant.delete({ where: { id: tenantId } });
  });
}
