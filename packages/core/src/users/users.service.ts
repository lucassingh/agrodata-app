import "server-only";
import { prisma } from "@repo/database";
import { forbidden, notFound } from "../errors";

export async function findUserTenants(userId: string) {
  return prisma.userTenantMembership.findMany({
    where: { userId, status: "ACTIVE" },
    include: { tenant: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function setActiveTenant(
  userId: string,
  tenantId: string,
  isSuperAdmin: boolean,
) {
  const membership = await prisma.userTenantMembership.findFirst({
    where: { userId, tenantId, status: "ACTIVE" },
  });
  if (!membership) {
    notFound("No tenés acceso a este campo o no está activo");
  }
  if (!isSuperAdmin && membership.role !== "ADMIN") {
    forbidden("Solo Farm Manager u Owner pueden cambiar el campo activo en la web.");
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { activeTenantId: tenantId },
  });
  return { id: user.id, activeTenantId: user.activeTenantId };
}
