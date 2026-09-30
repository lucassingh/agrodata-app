"use server";

import { registerUser, registerSchema, AppError, type RegisterInput } from "@repo/core";
import { signupMode } from "@/lib/signup-mode";

export async function registerAction(input: RegisterInput) {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
    };
  }
  try {
    const result = await registerUser(parsed.data, { signupMode: signupMode() });
    return {
      success: true as const,
      wNumber: result.wNumber ?? parsed.data.wNumber,
      mockCode: result.mockCode,
    };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    throw error;
  }
}
