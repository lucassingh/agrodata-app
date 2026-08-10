"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { requestWhatsappCode, AppError } from "@repo/core";

export async function requestWhatsappLoginCode(wNumber: string) {
  try {
    const result = await requestWhatsappCode(wNumber);
    return { success: true as const, mockCode: result.mockCode };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    throw error;
  }
}

export async function authenticate(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Email o contraseña incorrectos.";
        default:
          return "Ocurrió un error al iniciar sesión. Probá de nuevo.";
      }
    }
    // NEXT_REDIRECT no es un error real: hay que dejarlo pasar para que
    // Next.js complete la redirección a /dashboard.
    throw error;
  }
}
