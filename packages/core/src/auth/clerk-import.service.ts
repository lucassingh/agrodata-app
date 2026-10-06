import "server-only";
import { createClerkClient } from "@clerk/backend";
import { isClerkAPIResponseError } from "@clerk/backend/errors";
import { prisma } from "@repo/database";
import { canLinkClerkAccount, clerkNewUser } from "./clerk-import";

/** Cliente de la API de Clerk. Se crea al usarlo: el build no necesita la clave. */
function clerkApi() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("Falta CLERK_SECRET_KEY: no se puede hablar con Clerk.");
  return createClerkClient({ secretKey });
}

/** Quienes tienen cuenta web (tienen email) y todavía no están en Clerk, de la más vieja a la más nueva. */
export async function usersPendingClerkImport(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { clerkId: null, email: { not: null } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return users.map((user) => user.id);
}

export type ClerkImportResult = {
  outcome: "created" | "linked" | "skipped";
  detail?: string;
};

/** Pasa a una persona a Clerk y guarda su `clerkId`. Se puede repetir sin duplicar: si ya está en
 *  Clerk (el email es único allá), la vincula en vez de crearla. */
export async function importUserToClerk(userId: string): Promise<ClerkImportResult> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { id: true, name: true, lastname: true, email: true, passwordHash: true, createdAt: true, clerkId: true },
  });
  if (user.clerkId) return { outcome: "skipped", detail: "ya estaba en Clerk" };
  const params = clerkNewUser(user);
  if (!params || !user.email) return { outcome: "skipped", detail: "sin email" };

  const clerk = clerkApi();
  const { data: existing } = await clerk.users.getUserList({ emailAddress: [user.email], limit: 1 });
  const account = existing[0];
  if (account) {
    const verifiedEmails = account.emailAddresses
      .filter((address) => address.verification?.status === "verified")
      .map((address) => address.emailAddress);
    if (!canLinkClerkAccount({ id: user.id, email: user.email }, { externalId: account.externalId, verifiedEmails })) {
      return { outcome: "skipped", detail: "hay una cuenta de Clerk con ese email que no se puede vincular" };
    }
    if (account.externalId !== user.id) await clerk.users.updateUser(account.id, { externalId: user.id });
    await prisma.user.update({ where: { id: user.id }, data: { clerkId: account.id } });
    return { outcome: "linked" };
  }

  try {
    const created = await clerk.users.createUser(params);
    await prisma.user.update({ where: { id: user.id }, data: { clerkId: created.id } });
    return { outcome: "created" };
  } catch (error) {
    // 422: Clerk rechaza los datos (por ejemplo, un email inventado como `@agrodata.local`).
    // Reintentar no lo arregla: se saltea con el motivo. Lo demás se tira para que Inngest reintente.
    if (isClerkAPIResponseError(error) && error.status === 422) {
      return { outcome: "skipped", detail: error.errors[0]?.longMessage ?? error.message };
    }
    throw error;
  }
}
