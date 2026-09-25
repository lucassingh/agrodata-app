import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { badRequest } from "@repo/core";

/** Usuario de la web. Lo usan todas las páginas y server actions del dashboard,
 *  así que es el lugar donde se corta el acceso a quien ya no lo tiene (ej. un
 *  Farm Manager que pasó a Operator con la sesión abierta). */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/dashboard/sign-in");
  }
  if (!session.user.canAccessWeb) {
    redirect("/dashboard/sign-in?error=operator");
  }
  return session.user;
}

/** Equivalente al `tenantOrThrow` duplicado en cada controller del backend legacy. */
export async function requireActiveTenantId(): Promise<string> {
  const user = await requireUser();
  if (!user.activeTenantId) {
    badRequest("No hay un campo activo seleccionado.");
  }
  return user.activeTenantId;
}
