"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { resendWhatsappCode, AppError } from "@repo/core";

export async function verifyCodeAction(
  _prevState: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  try {
    await signIn("whatsapp-otp", {
      wNumber: formData.get("wNumber"),
      code: formData.get("code"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Código inválido o expirado.";
        default:
          return "Ocurrió un error al verificar el código.";
      }
    }
    throw error;
  }
}

export async function resendCodeAction(wNumber: string) {
  try {
    const result = await resendWhatsappCode(wNumber);
    return { success: true as const, mockCode: result.mockCode };
  } catch (error) {
    if (error instanceof AppError) return { success: false as const, error: error.message };
    throw error;
  }
}
