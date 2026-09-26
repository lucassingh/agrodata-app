/** Roles por campo (Etapa 4). Cada persona tiene un rol en cada campo:
 *  - OWNER (Dueño): todo en su campo;
 *  - ADMIN (Encargado, el «Farm Manager» del legacy): carga y edita, invita operarios;
 *  - ADVISOR (Asesor): ve y carga todo, arma informes; no borra ni gestiona equipo;
 *  - USER_GENERAL (Operario): solo WhatsApp.
 *  Los permisos se calculan con el rol en el campo activo. Soporte de la plataforma
 *  (emails en SUPER_ADMIN_EMAILS) tiene todo. Puro: se testea sin base. */

import type { Capabilities, PlatformRole } from "./capabilities";

export const FIELD_ROLES = ["OWNER", "ADMIN", "ADVISOR", "USER_GENERAL"] as const;
export type FieldRole = (typeof FIELD_ROLES)[number];

export const FIELD_ROLE_LABEL: Record<FieldRole, string> = {
  OWNER: "Dueño",
  ADMIN: "Encargado",
  ADVISOR: "Asesor",
  USER_GENERAL: "Operario",
};

/** Roles con acceso a la web (el operario solo usa WhatsApp). */
const WEB_ROLES: readonly FieldRole[] = ["OWNER", "ADMIN", "ADVISOR"];

export function isWebRole(role: string): boolean {
  return (WEB_ROLES as readonly string[]).includes(role);
}

/** Soporte de la plataforma: solo por la lista de emails configurada. La marca
 *  `isSuperAdmin` de la base no da permisos (el legacy la ponía a todo usuario
 *  que se registraba solo). */
export function isPlatformStaff(email: string | null | undefined): boolean {
  if (!email) return false;
  return (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

/** Rol que se muestra y autoriza en la web: el del campo activo. */
export function platformRoleFor(fieldRole: FieldRole | null, isStaff: boolean): PlatformRole {
  if (isStaff || fieldRole === "OWNER") return "OWNER";
  if (fieldRole === "ADMIN") return "FARM_MANAGER";
  if (fieldRole === "ADVISOR") return "ADVISOR";
  return "OPERATOR";
}

const NONE: Capabilities = {
  canCreateField: false,
  canUpdateField: false,
  canDeleteField: false,
  canManageBilling: false,
  canInviteFarmManager: false,
  canInviteOperator: false,
  canDeleteOperationalData: false,
};

/** Capacidades en el campo activo. La matriz del legacy se conserva (dueño = el
 *  Owner de antes, encargado = Farm Manager) y suma el asesor. Cualquiera con
 *  acceso a la web puede crear su propio campo, también quien todavía no tiene ninguno. */
export function capabilitiesForField(fieldRole: FieldRole | null, isStaff: boolean): Capabilities {
  if (isStaff || fieldRole === "OWNER") {
    return {
      canCreateField: true,
      canUpdateField: true,
      canDeleteField: true,
      canManageBilling: true,
      canInviteFarmManager: true,
      canInviteOperator: true,
      canDeleteOperationalData: true,
    };
  }
  if (fieldRole === "ADMIN") return { ...NONE, canCreateField: true, canInviteOperator: true };
  if (fieldRole === "ADVISOR") return { ...NONE, canCreateField: true };
  if (fieldRole === null) return { ...NONE, canCreateField: true };
  return NONE;
}

/** Acceso a la web: soporte, alguien con un rol web en algún campo, o alguien que
 *  todavía no tiene campos (para que pueda crear el suyo). */
export function canAccessWeb(input: { isStaff: boolean; activeRoles: string[]; totalMemberships: number }): boolean {
  return input.isStaff || input.activeRoles.some(isWebRole) || input.totalMemberships === 0;
}

// ── Equipo ─────────────────────────────────────────────────

/** A qué roles puede invitar o asignar quien tiene `actor` en el campo. */
export function assignableRoles(actor: FieldRole | null, isStaff: boolean): FieldRole[] {
  if (isStaff || actor === "OWNER") return [...FIELD_ROLES];
  if (actor === "ADMIN") return ["USER_GENERAL"];
  return [];
}

/** Si `actor` puede cambiar el rol de alguien que hoy es `from` a `to`. */
export function canChangeRole(actor: FieldRole | null, isStaff: boolean, from: FieldRole, to: FieldRole): boolean {
  const allowed = assignableRoles(actor, isStaff);
  return allowed.includes(from) && allowed.includes(to);
}

/** Si `actor` puede sacar del campo a alguien con rol `target`. */
export function canRemoveMember(actor: FieldRole | null, isStaff: boolean, target: FieldRole): boolean {
  return assignableRoles(actor, isStaff).includes(target);
}

/** Qué miembros ve cada rol en la pantalla de Equipo. Dueño, soporte y asesor ven
 *  a todos; el encargado, a los operarios y a sí mismo (regla del legacy); el
 *  resto, solo a sí mismo. */
export function visibleTeam<T extends { role: string; userId: string }>(
  actor: FieldRole | null,
  isStaff: boolean,
  viewerId: string,
  members: T[],
): T[] {
  if (isStaff || actor === "OWNER" || actor === "ADVISOR") return members;
  if (actor === "ADMIN") return members.filter((m) => m.role === "USER_GENERAL" || m.userId === viewerId);
  return members.filter((m) => m.userId === viewerId);
}

/** Un campo nunca queda sin dueño: no se puede sacar ni cambiar de rol al último. */
export function leavesFieldWithoutOwner(members: { id: string; role: string }[], changedId: string, newRole: FieldRole | null): boolean {
  const owners = members.filter((m) => m.role === "OWNER");
  const target = members.find((m) => m.id === changedId);
  return target?.role === "OWNER" && newRole !== "OWNER" && owners.length <= 1;
}
