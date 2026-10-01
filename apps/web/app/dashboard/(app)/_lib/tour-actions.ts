"use server";

import { markTourSeen } from "@repo/core";
import { isTourId } from "@/components/product-tour/tour-ids";
import { requireUser } from "@/lib/session";

/** Guarda que la persona terminó o cerró una guía. */
export async function markTourSeenAction(tourId: string): Promise<void> {
  const user = await requireUser();
  if (!isTourId(tourId)) return;
  await markTourSeen(user.id, tourId);
}
