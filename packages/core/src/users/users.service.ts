import "server-only";
import { prisma } from "@repo/database";
import { forbidden, notFound } from "../errors";
import { isWebRole } from "../auth/field-roles";

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
  if (!isSuperAdmin && !isWebRole(membership.role)) {
    forbidden("Los operarios usan AgroData por WhatsApp; la web es para dueños, encargados y asesores.");
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { activeTenantId: tenantId },
  });
  return { id: user.id, activeTenantId: user.activeTenantId };
}
