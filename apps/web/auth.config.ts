import type { NextAuthConfig } from "next-auth";

/**
 * Config compartida entre el runtime completo de Node (auth.ts) y el middleware
 * (edge runtime, no puede importar Prisma). Ver:
 * https://authjs.dev/guides/edge-compatibility
 */
export const authConfig = {
  pages: {
    signIn: "/dashboard/sign-in",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isOnDashboard = pathname.startsWith("/dashboard");
      const isPublicAuthPage =
        pathname === "/dashboard/sign-in" ||
        pathname === "/dashboard/register" ||
        pathname === "/dashboard/verify";

      if (isPublicAuthPage) {
        return !isLoggedIn || Response.redirect(new URL("/dashboard", request.nextUrl));
      }
      if (isOnDashboard) {
        return isLoggedIn;
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
