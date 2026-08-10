/**
 * Port directo de backend/src/auth/platform-role.util.ts + role-guards.util.ts.
 * El platformRole efectivo se recalcula siempre en vivo a partir de isSuperAdmin +
 * membresías ACTIVE con role ADMIN — el campo User.platformRole persistido nunca se
 * usa para autorizar (solo se muestra en listados de equipo). Ver CLAUDE.md / plan
 * de migración para el detalle de esta decisión, heredada del legacy.
 */

export type PlatformRole = "OWNER" | "FARM_MANAGER" | "OPERATOR";

export interface MembershipRoleInfo {
  role: "ADMIN" | "USER_GENERAL";
}

export interface Capabilities {
  canCreateField: boolean;
  canUpdateField: boolean;
  canDeleteField: boolean;
  canManageBilling: boolean;
  canInviteFarmManager: boolean;
  canInviteOperator: boolean;
  canDeleteOperationalData: boolean;
}

export function resolvePlatformRole(params: {
  isSuperAdmin: boolean;
  activeMemberships: MembershipRoleInfo[];
  persistedRole?: PlatformRole;
}): PlatformRole {
  if (params.persistedRole) return params.persistedRole;
  if (params.isSuperAdmin) return "OWNER";
  if (params.activeMemberships.some((m) => m.role === "ADMIN")) {
    return "FARM_MANAGER";
  }
  return "OPERATOR";
}

const CAPABILITIES_BY_ROLE: Record<PlatformRole, Capabilities> = {
  OWNER: {
    canCreateField: true,
    canUpdateField: true,
    canDeleteField: true,
    canManageBilling: true,
    canInviteFarmManager: true,
    canInviteOperator: true,
    canDeleteOperationalData: true,
  },
  FARM_MANAGER: {
    canCreateField: false,
    canUpdateField: false,
    canDeleteField: false,
    canManageBilling: false,
    canInviteFarmManager: false,
    canInviteOperator: true,
    canDeleteOperationalData: false,
  },
  OPERATOR: {
    canCreateField: false,
    canUpdateField: false,
    canDeleteField: false,
    canManageBilling: false,
    canInviteFarmManager: false,
    canInviteOperator: false,
    canDeleteOperationalData: false,
  },
};

export function capabilitiesForRole(role: PlatformRole): Capabilities {
  return CAPABILITIES_BY_ROLE[role];
}

export function effectiveIsSuperAdmin(isSuperAdmin: boolean, email?: string | null): boolean {
  if (isSuperAdmin) return true;
  const overrideList = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!email) return false;
  return overrideList.includes(email.toLowerCase());
}

export function canAccessWebApp(params: {
  isSuperAdmin: boolean;
  email?: string | null;
  activeMemberships: MembershipRoleInfo[];
  totalMembershipRows: number;
}): boolean {
  if (effectiveIsSuperAdmin(params.isSuperAdmin, params.email)) return true;
  if (params.activeMemberships.some((m) => m.role === "ADMIN")) return true;
  if (params.totalMembershipRows === 0) return true;
  return false;
}

export function assertCanCreateField(capabilities: Capabilities): void {
  if (!capabilities.canCreateField) {
    throw new Error("Solo el owner puede crear campos.");
  }
}

export function assertCanUpdateField(capabilities: Capabilities): void {
  if (!capabilities.canUpdateField) {
    throw new Error("Solo el owner puede editar campos.");
  }
}

export function assertCanDeleteField(capabilities: Capabilities): void {
  if (!capabilities.canDeleteField) {
    throw new Error("Solo el owner puede eliminar campos.");
  }
}

export function assertCanDeleteOperationalData(capabilities: Capabilities): void {
  if (!capabilities.canDeleteOperationalData) {
    throw new Error(
      "Tu rol puede crear y editar, pero no eliminar registros operativos.",
    );
  }
}
