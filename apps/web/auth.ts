import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma } from "@repo/database";
import {
  loginWithPassword,
  verifyWhatsappCode,
  resolvePlatformRole,
  capabilitiesForRole,
  effectiveIsSuperAdmin,
  AppError,
} from "@repo/core";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const whatsappOtpSchema = z.object({
  wNumber: z.string().min(1),
  code: z.string().length(6),
});

/**
 * No usamos @auth/prisma-adapter: espera modelos Account/Session/VerificationToken
 * y campos User.emailVerified/image que no existen en nuestro schema. Con
 * Credentials + sesión JWT no hace falta — el usuario se resuelve a mano en
 * `authorize`. Si más adelante se suma un provider OAuth, ahí sí vale agregar
 * el adapter (y los modelos que le corresponden).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        try {
          const user = await loginWithPassword(parsed.data.email, parsed.data.password);
          return { id: user.id };
        } catch (error) {
          if (error instanceof AppError) return null;
          throw error;
        }
      },
    }),
    Credentials({
      id: "whatsapp-otp",
      name: "whatsapp-otp",
      credentials: {
        wNumber: { label: "WhatsApp", type: "text" },
        code: { label: "Código", type: "text" },
      },
      async authorize(rawCredentials) {
        const parsed = whatsappOtpSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        try {
          const user = await verifyWhatsappCode(parsed.data.wNumber, parsed.data.code);
          return { id: user.id };
        } catch (error) {
          if (error instanceof AppError) return null;
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Recalcula rol/capacidades/tenant activo en vivo desde la base en cada
     * llamada a auth() — igual que JwtStrategy.validate del backend legacy, que
     * re-consulta la DB en cada request en vez de confiar en el JWT. Esto hace
     * que cambiar de campo activo, o que te saquen una membresía ADMIN, tenga
     * efecto inmediato sin necesitar un token nuevo.
     */
    async session({ session, token }) {
      if (!token.sub) return session;

      const user = await prisma.user.findUnique({
        where: { id: token.sub },
        select: {
          id: true,
          name: true,
          lastname: true,
          email: true,
          isSuperAdmin: true,
          activeTenantId: true,
          memberships: { where: { status: "ACTIVE" }, select: { role: true } },
        },
      });
      if (!user) return session;

      const isSuperAdmin = effectiveIsSuperAdmin(user.isSuperAdmin, user.email);
      const platformRole = resolvePlatformRole({
        isSuperAdmin,
        activeMemberships: user.memberships,
      });

      session.user.id = user.id;
      session.user.name = `${user.name} ${user.lastname}`;
      session.user.email = user.email ?? "";
      session.user.isSuperAdmin = isSuperAdmin;
      session.user.platformRole = platformRole;
      session.user.activeTenantId = user.activeTenantId;
      session.user.capabilities = capabilitiesForRole(platformRole);

      return session;
    },
  },
});
