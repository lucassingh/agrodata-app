"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

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
