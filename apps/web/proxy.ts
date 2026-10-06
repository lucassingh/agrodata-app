import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

/**
 * Proxy (lo que antes de Next 16 era `middleware.ts`): con Clerk, todo /dashboard/* pide sesión
 * menos ingresar y crear la cuenta. Quién es cada uno y qué puede hacer se resuelve después, en
 * `requireUser` (lib/session.ts), contra nuestra base.
 */
const isPublicAuthPage = createRouteMatcher(["/dashboard/sign-in(.*)", "/dashboard/register(.*)"]);

export default clerkMiddleware(
  async (auth, request) => {
    if (!isPublicAuthPage(request)) await auth.protect();
  },
  { signInUrl: "/dashboard/sign-in", signUpUrl: "/dashboard/register" },
);

export const config = {
  matcher: ["/dashboard/:path*"],
};
