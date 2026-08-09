import type { DefaultSession } from "next-auth";

type PlatformRole = "OWNER" | "FARM_MANAGER" | "OPERATOR";

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
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    platformRole?: PlatformRole;
    isSuperAdmin?: boolean;
  }
}
