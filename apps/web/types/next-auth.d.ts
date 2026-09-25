import type { DefaultSession } from "next-auth";
import type { Capabilities, PlatformRole } from "@repo/core";

declare module "next-auth" {
  interface User {
    platformRole?: PlatformRole;
    isSuperAdmin?: boolean;
  }

  interface Session {
    user: {
      id: string;
      platformRole: PlatformRole;
      isSuperAdmin: boolean;
      activeTenantId: string | null;
      capabilities: Capabilities;
      /** Owner o Farm Manager (los Operators solo usan WhatsApp). Ver `canAccessWebApp`. */
      canAccessWeb: boolean;
    } & DefaultSession["user"];
  }
}
