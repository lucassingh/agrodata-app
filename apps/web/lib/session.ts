import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { badRequest } from "@repo/core";

export async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/dashboard/sign-in");
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
