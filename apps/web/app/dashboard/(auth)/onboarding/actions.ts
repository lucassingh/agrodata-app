"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { AppError, completeOnboarding, onboardingSchema, type OnboardingInput } from "@repo/core";
import { signupMode } from "@/lib/signup-mode";

export async function completeOnboardingAction(input: OnboardingInput) {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const { userId } = await auth();
  const account = userId ? await currentUser() : null;
  const primary = account?.primaryEmailAddress;
  if (!userId || !primary) {
    return { success: false as const, error: "Tu sesión venció. Ingresá de nuevo." };
  }
  if (primary.verification?.status !== "verified") {
    return { success: false as const, error: "Primero verificá tu email." };
  }
  try {
    await completeOnboarding(parsed.data, { clerkId: userId, email: primary.emailAddress }, { signupMode: signupMode() });
    return { success: true as const };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    throw error;
  }
}
