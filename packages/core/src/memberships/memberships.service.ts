import "server-only";
import { prisma } from "@repo/database";
import type { MembershipStatus, SystemRole } from "@repo/database";
import { badRequest, forbidden, notFound } from "../errors";
import { effectiveIsSuperAdmin } from "../auth/capabilities";
import { normalizeArgWNumber, parseInviteIdentifier } from "./invite-identifier.util";

export interface MembershipInviterContext {
  userId: string;
  isSuperAdmin: boolean;
  email: string | null;
}

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

async function findActiveAdminMembership(userId: string, tenantId: string) {
  return prisma.userTenantMembership.findFirst({
    where: { userId, tenantId, status: "ACTIVE", role: "ADMIN" },
  });
}

/**
 * Port de MembershipsService.inviteMember (legacy). Nota conocida heredada del
 * legacy: invitar a un usuario YA REGISTRADO crea la membresía en estado
 * INVITED y no existe ningún endpoint que la pase a ACTIVE — es un gap real
 * del sistema original, documentado y replicado tal cual (ver CLAUDE.md /
 * reporte de migración).
 */
export async function inviteMember(
  inviter: MembershipInviterContext,
  input: { identifier: string; tenantId: string; role: SystemRole },
) {
  const canInvite = await findActiveAdminMembership(inviter.userId, input.tenantId);
  const isOwner = effectiveIsSuperAdmin(inviter.isSuperAdmin, inviter.email);

  if (!canInvite && !isOwner) {
    forbidden("No tenés permiso para invitar a este campo.");
  }
  if (input.role === "ADMIN" && !isOwner) {
    forbidden("Solo el owner puede invitar usuarios con rol Farm Manager.");
  }

  const rawId = input.identifier.trim();
  const orConditions: Array<{ id: string } | { email: string } | { wNumber: string }> = [
    { id: rawId },
  ];
  if (rawId.includes("@")) orConditions.push({ email: rawId.toLowerCase() });
  try {
    orConditions.push({ wNumber: normalizeArgWNumber(rawId) });
  } catch {
    // rawId no es un numero de whatsapp parseable -- se ignora esa rama del OR
  }

  const existingUser = await prisma.user.findFirst({ where: { OR: orConditions } });

  if (!existingUser) {
    const parsed = parseInviteIdentifier(rawId);
    const duplicateConditions: Array<{ email: string } | { wNumber: string }> = [];
    if (parsed.email) duplicateConditions.push({ email: parsed.email });
    if (parsed.wNumber) duplicateConditions.push({ wNumber: parsed.wNumber });

    const duplicate = await prisma.tenantPendingInvite.findFirst({
      where: { tenantId: input.tenantId, consumedAt: null, OR: duplicateConditions },
    });
    if (duplicate) {
      badRequest("Ya hay una invitación pendiente para ese contacto en este campo.");
    }

    const invite = await prisma.tenantPendingInvite.create({
      data: {
        tenantId: input.tenantId,
        role: input.role,
        invitedByUserId: inviter.userId,
        email: parsed.email,
        wNumber: parsed.wNumber,
      },
    });
    return {
      linked: false as const,
      pendingInviteId: invite.id,
      tenantId: input.tenantId,
      role: input.role,
    };
  }

  const existingMembership = await prisma.userTenantMembership.findUnique({
    where: { userId_tenantId: { userId: existingUser.id, tenantId: input.tenantId } },
  });
  if (existingMembership) {
    badRequest("Este usuario ya pertenece a ese campo.");
  }

  const membership = await prisma.userTenantMembership.create({
    data: {
      userId: existingUser.id,
      tenantId: input.tenantId,
      role: input.role,
      status: "INVITED",
    },
  });
  return { linked: true as const, membership };
}

export async function updateMembershipRole(
  inviter: MembershipInviterContext,
  membershipId: string,
  role: SystemRole,
) {
  const membership = await prisma.userTenantMembership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) notFound("Membresía no encontrada");

  const canManage = await findActiveAdminMembership(inviter.userId, membership.tenantId);
  const isOwner = effectiveIsSuperAdmin(inviter.isSuperAdmin, inviter.email);
  if (!canManage && !isOwner) forbidden("No tenés permiso para modificar roles en este campo.");
  if (role === "ADMIN" && !isOwner) forbidden("Solo el owner puede promover a Farm Manager.");

  return prisma.userTenantMembership.update({ where: { id: membershipId }, data: { role } });
}

export async function removeMembership(
  inviter: MembershipInviterContext,
  membershipId: string,
) {
  const membership = await prisma.userTenantMembership.findUnique({
    where: { id: membershipId },
  });
  if (!membership) notFound("Membresía no encontrada");

  const canManage = await findActiveAdminMembership(inviter.userId, membership.tenantId);
  const isOwner = effectiveIsSuperAdmin(inviter.isSuperAdmin, inviter.email);
  if (!canManage && !isOwner) forbidden("No tenés permiso para quitar miembros de este campo.");
  if (membership.role === "ADMIN" && !isOwner) {
    forbidden("Solo el owner puede quitar un Farm Manager.");
  }

  await prisma.userTenantMembership.delete({ where: { id: membershipId } });
}

export interface TeamMemberRow {
  id: string;
  userId: string;
  name: string;
  lastname: string;
  fullName: string;
  email: string | null;
  wNumber: string | null;
  role: SystemRole;
  status: MembershipStatus;
  profileType: string;
  isSuperAdmin: boolean;
  platformRole: string;
  invitedAt: Date;
  acceptedAt: Date | null;
  registeredAt: Date;
}

export async function getTeamMembers(tenantId: string): Promise<TeamMemberRow[]> {
  const memberships = await prisma.userTenantMembership.findMany({
    where: { tenantId },
    include: { user: true },
  });

  const rows: TeamMemberRow[] = memberships.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    lastname: m.user.lastname,
    fullName: `${m.user.name} ${m.user.lastname}`,
    email: m.user.email,
    wNumber: m.user.wNumber,
    role: m.role,
    status: m.status,
    profileType: m.user.profileType,
    isSuperAdmin: m.user.isSuperAdmin,
    platformRole: m.user.platformRole,
    invitedAt: m.invitedAt,
    acceptedAt: m.acceptedAt,
    registeredAt: m.user.createdAt,
  }));

  rows.sort((a, b) => {
    if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
    if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
    return a.fullName.localeCompare(b.fullName, "es");
  });

  return rows;
}

/** Port de getTeamMembersForViewer (legacy) -- las reglas de visibilidad son
 *  el detalle más delicado de este módulo, ver CLAUDE.md §6 del roles doc. */
export async function getTeamMembersForViewer(
  viewer: MembershipInviterContext,
  tenantId: string,
): Promise<TeamMemberRow[]> {
  const access = await prisma.userTenantMembership.findFirst({
    where: { userId: viewer.userId, tenantId, status: "ACTIVE" },
  });
  const isOwner = effectiveIsSuperAdmin(viewer.isSuperAdmin, viewer.email);
  if (!access && !isOwner) forbidden("No tenés acceso a este campo.");

  const all = await getTeamMembers(tenantId);
  if (isOwner) return all;
  if (access?.role === "ADMIN") {
    return all.filter((m) => m.role === "USER_GENERAL" || m.userId === viewer.userId);
  }
  return all.filter((m) => m.userId === viewer.userId);
}

/** Dev/QA-only, igual que el legacy: crea un Operator demo con membresía ACTIVE
 *  inmediata para poder probar la tabla de equipo antes de tener WhatsApp real. */
export async function seedDemoOperator(
  inviter: MembershipInviterContext,
  tenantId: string,
) {
  const allowed =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_OPERATOR_SEED === "true";
  if (!allowed) forbidden("Seed de operador demo deshabilitado en este entorno.");

  const canManage = await findActiveAdminMembership(inviter.userId, tenantId);
  const isOwner = effectiveIsSuperAdmin(inviter.isSuperAdmin, inviter.email);
  if (!canManage && !isOwner) {
    forbidden("No tenés permiso para crear el operador demo en este campo.");
  }

  const sanitizedTenantId = tenantId.replace(/[^a-zA-Z0-9]/g, "");
  const email = `operator.demo.${sanitizedTenantId}@agrodata.local`;

  let user = await prisma.user.findUnique({ where: { email } });
  let alreadyExisted = false;
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "Operador",
        lastname: "Demo",
        email,
        platformRole: "OPERATOR",
        isSuperAdmin: false,
      },
    });
  } else {
    alreadyExisted = true;
  }

  let membership = await prisma.userTenantMembership.findUnique({
    where: { userId_tenantId: { userId: user.id, tenantId } },
  });
  if (!membership) {
    membership = await prisma.userTenantMembership.create({
      data: { userId: user.id, tenantId, role: "USER_GENERAL", status: "ACTIVE", acceptedAt: new Date() },
    });
  } else {
    alreadyExisted = true;
  }

  return { alreadyExisted, userId: user.id, membershipId: membership.id, email: user.email };
}
