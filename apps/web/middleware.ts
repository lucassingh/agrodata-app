import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * Middleware corre en Edge runtime — no puede importar `auth.ts` completo
 * (Prisma no es edge-safe). Por eso usa `authConfig` a secas, sin providers.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/dashboard/:path*"],
};
