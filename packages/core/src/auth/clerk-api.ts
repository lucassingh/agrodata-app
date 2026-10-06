import "server-only";
import { createClerkClient } from "@clerk/backend";
import { isClerkAPIResponseError } from "@clerk/backend/errors";
import { ACCESS_INVITE_DAYS } from "../access/signup-policy";

/** Cliente de la API de Clerk (el login). Se crea al usarlo: el build no necesita la clave. */
export function clerkApi() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("Falta CLERK_SECRET_KEY: no se puede hablar con Clerk.");
  return createClerkClient({ secretKey });
}

/** Emails verificados de una cuenta de Clerk, en minúscula. */
export function verifiedEmailsOf(account: {
  emailAddresses: { emailAddress: string; verification: { status: string } | null }[];
}): string[] {
  return account.emailAddresses
    .filter((address) => address.verification?.status === "verified")
    .map((address) => address.emailAddress.toLowerCase());
}

/**
 * Link para crear la cuenta con una invitación de Clerk: sirve aunque el registro esté cerrado.
 * Si esa persona ya tiene una invitación pendiente, devuelve la misma (no se acumulan). Clerk no
 * manda ningún mail: el aviso, en castellano, lo mandamos nosotros o va por WhatsApp. Si ya tiene
 * cuenta en Clerk, el link es el de ingresar.
 */
export async function clerkInvitationLink(email: string, baseUrl: string): Promise<string> {
  const base = baseUrl.replace(/\/$/, "");
  const clerk = clerkApi();
  const { data: pending } = await clerk.invitations.getInvitationList({ status: "pending", query: email });
  const existing = pending.find((invitation) => invitation.emailAddress.toLowerCase() === email && invitation.url);
  if (existing?.url) return existing.url;

  try {
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: `${base}/dashboard/register`,
      notify: false,
      expiresInDays: ACCESS_INVITE_DAYS,
    });
    if (!invitation.url) throw new Error("Clerk no devolvió el link de la invitación.");
    return invitation.url;
  } catch (error) {
    if (isClerkAPIResponseError(error) && error.errors.some((e) => e.code === "form_identifier_exists")) {
      return `${base}/dashboard/sign-in`;
    }
    throw error;
  }
}
