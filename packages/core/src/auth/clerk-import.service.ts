import "server-only";
import { isClerkAPIResponseError } from "@clerk/backend/errors";
import { prisma } from "@repo/database";
import { clerkApi, verifiedEmailsOf } from "./clerk-api";
import { canLinkClerkAccount, clerkNewUser } from "./clerk-import";

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

/** El `external_id` de una cuenta de Clerk solo cuenta si todavía es alguien de la base: al volver a
 *  cargar la cuenta demo (`db:seed:demo`) las personas cambian de id y el viejo queda colgado. */
export async function liveExternalId(externalId: string | null): Promise<string | null> {
  if (!externalId) return null;
  const owner = await prisma.user.findUnique({ where: { id: externalId }, select: { id: true } });
  return owner ? externalId : null;
}

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
    const externalId = await liveExternalId(account.externalId);
    if (!canLinkClerkAccount({ id: user.id, email: user.email }, { externalId, verifiedEmails: verifiedEmailsOf(account) })) {
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
