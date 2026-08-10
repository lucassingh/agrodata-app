import "server-only";
import { prisma } from "@repo/database";
import { forbidden, notFound } from "../errors";
import type { CreateTenantInput, UpdateTenantInput } from "./tenants.schema";

async function assertTenantAdmin(userId: string, tenantId: string, action: string) {
  const membership = await prisma.userTenantMembership.findFirst({
    where: { userId, tenantId, status: "ACTIVE" },
  });
  if (!membership) notFound("Campo no encontrado");
  if (membership.role !== "ADMIN") {
    forbidden(`Solo administradores pueden ${action} este campo`);
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

export async function createTenantForUser(userId: string, input: CreateTenantInput) {
  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({ data: input });
    await tx.userTenantMembership.create({
      data: {
        userId,
        tenantId: tenant.id,
        role: "ADMIN",
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });
    await tx.user.update({
      where: { id: userId },
      data: { activeTenantId: tenant.id },
    });
    return { ...tenant, myRole: "ADMIN" as const };
  });
}

export async function updateTenant(
  userId: string,
  tenantId: string,
  input: UpdateTenantInput,
) {
  await assertTenantAdmin(userId, tenantId, "editar");
  return prisma.tenant.update({ where: { id: tenantId }, data: input });
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
