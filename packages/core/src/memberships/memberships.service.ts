import "server-only";
import { prisma } from "@repo/database";
import type { MembershipStatus, SystemRole } from "@repo/database";
import { badRequest, forbidden, notFound } from "../errors";
import {
  assignableRoles,
  canChangeRole,
  canRemoveMember,
  FIELD_ROLE_LABEL,
  isPlatformStaff,
  leavesFieldWithoutOwner,
  visibleTeam,
  type FieldRole,
} from "../auth/field-roles";
import { normalizeArgWNumber, parseInviteIdentifier } from "./invite-identifier.util";

export interface MembershipInviterContext {
  userId: string;
  email: string | null;
}

/** Rol de quien actúa en ese campo (null si no tiene) y si es soporte de la plataforma. */
async function actorInField(actor: MembershipInviterContext, tenantId: string) {
  const membership = await prisma.userTenantMembership.findFirst({
    where: { userId: actor.userId, tenantId, status: "ACTIVE" },
  });
  return { role: (membership?.role ?? null) as FieldRole | null, isStaff: isPlatformStaff(actor.email) };
}

/**
 * Port de AuthService.register's redeemPendingInvitesForNewUser (backend legacy).
 * Consume cualquier TenantPendingInvite sin usar que matchee el email o wNumber del
 * usuario recién creado, creando membresías ACTIVE inmediatamente (igual que las
 * invitaciones a usuarios ya existentes, ver `inviteMember`).
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

/**
 * Port de MembershipsService.inviteMember (legacy). Invitar a un usuario YA
 * REGISTRADO crea la membresía ACTIVE en el momento. El legacy la dejaba en
 * INVITED sin ningún endpoint para aceptarla (quedaba colgada para siempre); un
 * paso de "aceptar" en la web tampoco sirve, porque los operarios no tienen
 * acceso web: solo usan WhatsApp.
 */
export async function inviteMember(
  inviter: MembershipInviterContext,
  input: { identifier: string; tenantId: string; role: SystemRole },
) {
  const actor = await actorInField(inviter, input.tenantId);
  const allowed = assignableRoles(actor.role, actor.isStaff);
  if (allowed.length === 0) forbidden("No tenés permiso para invitar a este campo.");
  if (!allowed.includes(input.role as FieldRole)) {
    forbidden(`Tu rol no puede invitar a alguien como ${FIELD_ROLE_LABEL[input.role as FieldRole] ?? input.role}.`);
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
      status: "ACTIVE",
      acceptedAt: new Date(),
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

  const actor = await actorInField(inviter, membership.tenantId);
  if (!canChangeRole(actor.role, actor.isStaff, membership.role as FieldRole, role as FieldRole)) {
    forbidden("Tu rol no puede hacer ese cambio en este campo.");
  }
  const members = await prisma.userTenantMembership.findMany({ where: { tenantId: membership.tenantId, status: "ACTIVE" } });
  if (leavesFieldWithoutOwner(members, membershipId, role as FieldRole)) {
    badRequest("El campo tiene que tener al menos un dueño. Pasá la titularidad a otra persona primero.");
  }

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

  const actor = await actorInField(inviter, membership.tenantId);
  if (!canRemoveMember(actor.role, actor.isStaff, membership.role as FieldRole)) {
    forbidden("Tu rol no puede quitar a esta persona del campo.");
  }
  const members = await prisma.userTenantMembership.findMany({ where: { tenantId: membership.tenantId, status: "ACTIVE" } });
  if (leavesFieldWithoutOwner(members, membershipId, null)) {
    badRequest("El campo tiene que tener al menos un dueño. Pasá la titularidad a otra persona primero.");
  }

  await prisma.userTenantMembership.delete({ where: { id: membershipId } });
}

/** Pasar la titularidad (ej. el asesor que creó el campo de su cliente): la otra
 *  persona queda como dueña y quien la pasa sigue en el campo con el rol que elija
 *  (por defecto, asesor). */
export async function transferOwnership(
  actor: MembershipInviterContext,
  tenantId: string,
  toMembershipId: string,
  myNewRole: FieldRole = "ADVISOR",
) {
  const me = await prisma.userTenantMembership.findFirst({ where: { userId: actor.userId, tenantId, status: "ACTIVE" } });
  if (!me || me.role !== "OWNER") forbidden("Solo el dueño puede pasar la titularidad.");
  const target = await prisma.userTenantMembership.findFirst({ where: { id: toMembershipId, tenantId, status: "ACTIVE" } });
  if (!target) notFound("Esa persona no está activa en el campo.");
  if (target.id === me.id) badRequest("Ya sos el dueño de este campo.");
  await prisma.$transaction([
    prisma.userTenantMembership.update({ where: { id: target.id }, data: { role: "OWNER" } }),
    prisma.userTenantMembership.update({ where: { id: me.id }, data: { role: myNewRole } }),
  ]);
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
  const actor = await actorInField(viewer, tenantId);
  if (!actor.role && !actor.isStaff) forbidden("No tenés acceso a este campo.");
  return visibleTeam(actor.role, actor.isStaff, viewer.userId, await getTeamMembers(tenantId));
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

  const actor = await actorInField(inviter, tenantId);
  if (!assignableRoles(actor.role, actor.isStaff).includes("USER_GENERAL")) {
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
