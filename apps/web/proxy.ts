import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * Proxy (lo que antes de Next 16 era `middleware.ts`): protege /dashboard/* y
 * manda a /dashboard/sign-in sin sesión. Usa `authConfig` a secas, sin providers,
 * para no cargar Prisma en cada request.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/dashboard/:path*"],
};
