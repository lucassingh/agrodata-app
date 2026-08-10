import "server-only";
import { prisma } from "@repo/database";
import type { SystemRole } from "@repo/database";

/**
 * Port de AuthService.register's redeemPendingInvitesForNewUser (backend legacy).
 * Consume cualquier TenantPendingInvite sin usar que matchee el email o wNumber del
 * usuario recién creado, creando membresías ACTIVE inmediatamente (a diferencia de
 * las invitaciones a usuarios ya existentes, que quedan en INVITED).
 */
export async function redeemPendingInvitesForNewUser(
  userId: string,
  email: string,
  wNumber: string,
): Promise<Array<{ tenantId: string; role: SystemRole }>> {
  const invites = await prisma.tenantPendingInvite.findMany({
    where: { consumedAt: null, OR: [{ email }, { wNumber }] },
  });

  const redeemed: Array<{ tenantId: string; role: SystemRole }> = [];

  for (const invite of invites) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.userTenantMembership.findUnique({
        where: { userId_tenantId: { userId, tenantId: invite.tenantId } },
      });
      if (!existing) {
        await tx.userTenantMembership.create({
          data: {
            userId,
            tenantId: invite.tenantId,
            role: invite.role,
            status: "ACTIVE",
            acceptedAt: new Date(),
          },
        });
      }
      await tx.tenantPendingInvite.update({
        where: { id: invite.id },
        data: { consumedAt: new Date(), consumedUserId: userId },
      });
    });
    redeemed.push({ tenantId: invite.tenantId, role: invite.role });
  }

  return redeemed;
}
