"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { requestOrigin } from "@/lib/request-origin";
import type { SystemRole } from "@repo/database";
import {
  AppError,
  clerkInvitationLink,
  inviteMemberSchema,
  inviteMember,
  updateMembershipRoleSchema,
  updateMembershipRole,
  removeMembership,
  seedDemoOperator,
  transferOwnership,
} from "@repo/core";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function ok<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

function fail<T>(message: string): ActionResult<T> {
  return { success: false, error: message };
}

async function inviterContext() {
  const user = await requireUser();
  return { userId: user.id, email: user.email ?? null };
}

/** `link`: con email y sin cuenta, la invitación para crearla (sirve aunque el registro esté
 *  cerrado). Un operario por WhatsApp queda dado de alta en el momento, sin link. */
export async function inviteMemberAction(input: {
  identifier: string;
  tenantId: string;
  role: SystemRole;
  name?: string;
}): Promise<ActionResult<{ linked: boolean; link: string | null }>> {
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }
  try {
    const inviter = await inviterContext();
    const result = await inviteMember(inviter, parsed.data);
    const link = result.email ? await clerkInvitationLink(result.email, await requestOrigin()) : null;
    revalidatePath("/dashboard/team");
    return ok({ linked: result.linked, link });
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function updateRoleAction(
  membershipId: string,
  role: SystemRole,
): Promise<ActionResult> {
  const parsed = updateMembershipRoleSchema.safeParse({ role });
  if (!parsed.success) return fail("Rol inválido.");
  try {
    const inviter = await inviterContext();
    await updateMembershipRole(inviter, membershipId, parsed.data.role);
    revalidatePath("/dashboard/team");
    return ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function removeMemberAction(membershipId: string): Promise<ActionResult> {
  try {
    const inviter = await inviterContext();
    await removeMembership(inviter, membershipId);
    revalidatePath("/dashboard/team");
    return ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function transferOwnershipAction(
  tenantId: string,
  toMembershipId: string,
): Promise<ActionResult> {
  try {
    const actor = await inviterContext();
    await transferOwnership(actor, tenantId, toMembershipId);
    // El rol en el campo cambia los permisos de toda la app.
    revalidatePath("/dashboard", "layout");
    return ok(undefined);
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}

export async function seedDemoOperatorAction(
  tenantId: string,
): Promise<ActionResult<{ alreadyExisted: boolean }>> {
  try {
    const inviter = await inviterContext();
    const result = await seedDemoOperator(inviter, tenantId);
    revalidatePath("/dashboard/team");
    return ok({ alreadyExisted: result.alreadyExisted });
  } catch (error) {
    if (error instanceof AppError) return fail(error.message);
    throw error;
  }
}
