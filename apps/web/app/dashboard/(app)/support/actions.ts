"use server";

import { revalidatePath } from "next/cache";
import { AppError, assertPlatformStaff, updateDemoRequestStatus } from "@repo/core";
import type { DemoRequestStatus } from "@repo/database";
import { requireUser } from "@/lib/session";

const STATUSES: DemoRequestStatus[] = ["NEW", "CONTACTED", "DISCARDED"];

export async function updateDemoRequestStatusAction(
  id: string,
  status: DemoRequestStatus,
): Promise<{ success: true } | { success: false; error: string }> {
  const user = await requireUser();
  try {
    assertPlatformStaff(user.email);
    if (!STATUSES.includes(status)) return { success: false, error: "Estado inválido." };
    await updateDemoRequestStatus(id, status);
    revalidatePath("/dashboard/support");
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) return { success: false, error: error.message };
    throw error;
  }
}
