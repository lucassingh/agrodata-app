import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import {
  assertFieldWritable,
  badRequest,
  linkClerkAccountByEmail,
  verifiedEmailsOf,
  webUserForClerkId,
  type WebUser,
} from "@repo/core";

/** La persona de la sesión de Clerk en nuestra base, o `null` si todavía no tiene cuenta en campIA.
 *  En su primer ingreso, quien ya tenía cuenta y no estaba en la copia a Clerk se vincula por su
 *  email verificado. Una vez por request (`cache`). */
export const getWebUser = cache(async (): Promise<WebUser | null> => {
  const { userId, sessionClaims } = await auth();
  if (!userId) return null;
  const user = await webUserForClerkId(userId, sessionClaims?.email);
  if (user) return user;

  const account = await currentUser();
  if (!account) return null;
  const linked = await linkClerkAccountByEmail(userId, {
    externalId: account.externalId,
    verifiedEmails: verifiedEmailsOf(account),
  });
  return linked ? webUserForClerkId(userId, sessionClaims?.email) : null;
});

/** Usuario de la web. Lo usan todas las páginas y server actions del dashboard,
 *  así que es el lugar donde se corta el acceso a quien ya no lo tiene (ej. un
 *  encargado que pasó a operario con la sesión abierta). */
export async function requireUser(): Promise<WebUser> {
  const { userId } = await auth();
  if (!userId) redirect("/dashboard/sign-in");
  const user = await getWebUser();
  // Tiene cuenta en Clerk pero todavía no en campIA: completa sus datos.
  if (!user) redirect("/dashboard/onboarding");
  if (!user.canAccessWeb) redirect("/dashboard/no-access");
  return user;
}

/** Equivalente al `tenantOrThrow` duplicado en cada controller del backend legacy. */
export async function requireActiveTenantId(): Promise<string> {
  const user = await requireUser();
  if (!user.activeTenantId) {
    badRequest("No hay un campo activo seleccionado.");
  }
  return user.activeTenantId;
}

/** Para las acciones que cargan, editan o borran datos del campo: en modo
 *  lectura (venció la prueba o el plan) se cortan con un mensaje claro. Las
 *  lecturas siguen usando `requireActiveTenantId`. */
export async function requireWritableTenantId(): Promise<string> {
  const tenantId = await requireActiveTenantId();
  await assertFieldWritable(tenantId);
  return tenantId;
}
