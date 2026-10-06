import "server-only";
import { prisma } from "@repo/database";
import type { Capabilities, PlatformRole } from "./capabilities";
import { clerkApi } from "./clerk-api";
import { canLinkClerkAccount } from "./clerk-import";
import { liveExternalId } from "./clerk-import.service";
import { canAccessWeb, capabilitiesForField, isPlatformStaff, platformRoleFor, type FieldRole } from "./field-roles";

/** La persona que usa la web, con lo que hace falta en cada request. */
export interface WebUser {
  id: string;
  name: string;
  email: string;
  /** Soporte de la plataforma (SUPER_ADMIN_EMAILS), no la marca de la base. */
  isSuperAdmin: boolean;
  /** Rol en el campo activo; los permisos salen de acá. */
  fieldRole: FieldRole | null;
  platformRole: PlatformRole;
  activeTenantId: string | null;
  capabilities: Capabilities;
  /** Dueño, encargado o asesor en algún campo (los operarios solo usan WhatsApp). */
  canAccessWeb: boolean;
}

/**
 * La persona de su cuenta de Clerk, con rol, campo activo y permisos recalculados en vivo en cada
 * request (no se confía en nada guardado en la sesión): cambiar de campo o perder un rol tiene
 * efecto en el momento. `sessionEmail` es el email del token de sesión de Clerk; si alguien lo
 * cambió allá, se actualiza acá (el soporte y las invitaciones se reconocen por email).
 */
export async function webUserForClerkId(clerkId: string, sessionEmail?: string | null): Promise<WebUser | null> {
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      name: true,
      lastname: true,
      email: true,
      activeTenantId: true,
      memberships: { where: { status: "ACTIVE" }, select: { role: true, tenantId: true } },
      _count: { select: { memberships: true } },
    },
  });
  if (!user) return null;

  let email = user.email ?? "";
  const fromSession = sessionEmail?.trim().toLowerCase();
  if (fromSession && fromSession !== email) {
    const taken = await prisma.user.findUnique({ where: { email: fromSession }, select: { id: true } });
    if (!taken) {
      await prisma.user.update({ where: { id: user.id }, data: { email: fromSession } });
      email = fromSession;
    }
  }

  const isStaff = isPlatformStaff(email);
  const fieldRole = (user.memberships.find((m) => m.tenantId === user.activeTenantId)?.role ?? null) as FieldRole | null;
  return {
    id: user.id,
    name: `${user.name} ${user.lastname}`.trim(),
    email,
    isSuperAdmin: isStaff,
    fieldRole,
    platformRole: platformRoleFor(fieldRole, isStaff),
    activeTenantId: user.activeTenantId,
    capabilities: capabilitiesForField(fieldRole, isStaff),
    canAccessWeb: canAccessWeb({
      isStaff,
      activeRoles: user.memberships.map((m) => m.role),
      totalMemberships: user._count.memberships,
    }),
  };
}

/**
 * Primer ingreso de alguien que ya tenía cuenta y no estaba en la copia a Clerk: se vincula por
 * email, solo si Clerk lo verificó (si no, cualquiera podría registrarse con el email de otro y
 * quedarse con sus campos). Devuelve si quedó vinculada.
 */
export async function linkClerkAccountByEmail(
  clerkId: string,
  account: { externalId: string | null; verifiedEmails: string[] },
): Promise<boolean> {
  if (account.verifiedEmails.length === 0) return false;
  const candidates = await prisma.user.findMany({
    where: { clerkId: null, email: { in: account.verifiedEmails } },
    select: { id: true, email: true },
  });
  const [user] = candidates;
  if (candidates.length !== 1 || !user?.email) return false;

  const externalId = await liveExternalId(account.externalId);
  if (!canLinkClerkAccount({ id: user.id, email: user.email }, { externalId, verifiedEmails: account.verifiedEmails })) {
    return false;
  }
  await prisma.user.update({ where: { id: user.id }, data: { clerkId } });
  if (account.externalId !== user.id) {
    // Para que una próxima copia la reconozca. Si falla, el vínculo ya está hecho igual.
    await clerkApi()
      .users.updateUser(clerkId, { externalId: user.id })
      .catch((error: unknown) => console.error("[clerk] no se pudo guardar el external_id", { userId: user.id, error }));
  }
  return true;
}
