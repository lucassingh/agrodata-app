import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Ingresar — campIA",
};

/** Ingreso con email y contraseña o con Google, «olvidé mi contraseña» y verificación: Clerk.
 *  La ruta es un catch-all porque Clerk usa sub-rutas para cada paso (ej. el código por email). */
export default function SignInPage() {
  return <SignIn path="/dashboard/sign-in" routing="path" />;
}
