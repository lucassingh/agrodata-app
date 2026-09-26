import type { DefaultSession } from "next-auth";
import type { Capabilities, FieldRole, PlatformRole } from "@repo/core";

declare module "next-auth" {
  interface User {
    platformRole?: PlatformRole;
    isSuperAdmin?: boolean;
  }

  interface Session {
    user: {
      id: string;
      platformRole: PlatformRole;
      /** Soporte de la plataforma (SUPER_ADMIN_EMAILS), no la marca de la base. */
      isSuperAdmin: boolean;
      activeTenantId: string | null;
      /** Rol en el campo activo; los permisos salen de acá. */
      fieldRole: FieldRole | null;
      capabilities: Capabilities;
      /** Dueño, encargado o asesor en algún campo (los operarios solo usan WhatsApp). Ver `canAccessWeb`. */
      canAccessWeb: boolean;
    } & DefaultSession["user"];
  }
}
