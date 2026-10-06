import "server-only";
import { prisma } from "@repo/database";
import { consumeAccessInvitesFor, hasOpenAccessInvite, hasPendingTeamInvite } from "../access/access-invites.service";
import { canRegister, INVITE_REQUIRED_MESSAGE, type SignupMode } from "../access/signup-policy";
import { TRIAL_DAYS } from "../billing/plans";
import { conflict, forbidden } from "../errors";
import { redeemPendingInvitesForNewUser } from "../memberships/memberships.service";
import { isPlatformStaff } from "./field-roles";
import type { OnboardingInput } from "./onboarding.schema";

/**
 * Alta en campIA de quien ya creó su cuenta en Clerk (Clerk verificó el email y maneja la
 * contraseña). Arranca la prueba gratis, marca el acceso de Campia como usado y toma las
 * invitaciones de equipo pendientes para su email o su WhatsApp.
 * Con el registro por invitación (`signupMode`) se vuelve a controlar acá, además de en Clerk.
 */
export async function completeOnboarding(
  input: OnboardingInput,
  account: { clerkId: string; email: string },
  options: { signupMode: SignupMode },
) {
  const email = account.email.trim().toLowerCase();

  const done = await prisma.user.findUnique({ where: { clerkId: account.clerkId }, select: { id: true } });
  if (done) return done;

  const [hasAccessInvite, hasTeamInvite] = await Promise.all([
    hasOpenAccessInvite(email),
    hasPendingTeamInvite(email, input.wNumber),
  ]);
  if (!canRegister({ mode: options.signupMode, hasAccessInvite, hasTeamInvite, isStaff: isPlatformStaff(email) })) {
    forbidden(INVITE_REQUIRED_MESSAGE);
  }

  const [existingEmail, existingPhone] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { wNumber: input.wNumber }, select: { id: true } }),
  ]);
  if (existingEmail) conflict("Ya existe una cuenta con ese email.");
  if (existingPhone) conflict("Ya existe una cuenta con ese número de WhatsApp.");

  const user = await prisma.user.create({
    data: {
      name: input.name,
      lastname: input.lastname,
      email,
      wNumber: input.wNumber,
      clerkId: account.clerkId,
      profileType: input.profileType ?? "OTRO",
      // Los permisos son por campo: crear la cuenta no da permisos de plataforma.
      isSuperAdmin: false,
      // Arranca la prueba gratis, con todo el plan Asesor y sin tarjeta.
      subscription: { create: { trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000) } },
    },
    select: { id: true },
  });

  await consumeAccessInvitesFor(email, user.id);
  const [first] = await redeemPendingInvitesForNewUser(user.id, email, input.wNumber);
  if (first) {
    await prisma.user.update({ where: { id: user.id }, data: { activeTenantId: first.tenantId } });
  }
  return user;
}
