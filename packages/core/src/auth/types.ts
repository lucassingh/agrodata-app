import type { Capabilities, PlatformRole } from "./capabilities";

/** Contexto de usuario ya resuelto — equivalente a RequestUser del backend legacy. */
export interface RequestUser {
  id: string;
  email: string | null;
  isSuperAdmin: boolean;
  activeTenantId: string | null;
  platformRole: PlatformRole;
  capabilities: Capabilities;
}
