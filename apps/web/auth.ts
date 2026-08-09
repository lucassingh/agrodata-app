import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { prisma, verifyPassword } from "@repo/database";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const isValid = await verifyPassword(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: `${user.name} ${user.lastname}`,
          email: user.email,
          platformRole: user.platformRole,
          isSuperAdmin: user.isSuperAdmin,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt({ token, user }) {
      if (user) {
        token.platformRole = user.platformRole;
        token.isSuperAdmin = user.isSuperAdmin;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.platformRole = token.platformRole as
          | "OWNER"
          | "FARM_MANAGER"
          | "OPERATOR";
        session.user.isSuperAdmin = token.isSuperAdmin as boolean;
      }
      return session;
    },
  },
});
