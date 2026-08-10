"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import type { SystemRole } from "@repo/database";
import {
  AppError,
  inviteMemberSchema,
  inviteMember,
  updateMembershipRoleSchema,
  updateMembershipRole,
  removeMembership,
  seedDemoOperator,
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
  return { userId: user.id, isSuperAdmin: user.isSuperAdmin, email: user.email ?? null };
}

export async function inviteMemberAction(input: {
  identifier: string;
  tenantId: string;
  role: SystemRole;
}): Promise<ActionResult<{ linked: boolean }>> {
  const parsed = inviteMemberSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Datos inválidos.");
  }
  try {
    const inviter = await inviterContext();
    const result = await inviteMember(inviter, parsed.data);
    revalidatePath("/dashboard/team");
    return ok({ linked: result.linked });
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
