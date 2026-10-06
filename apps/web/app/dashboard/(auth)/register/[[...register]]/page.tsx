import type { Metadata } from "next";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { signupMode } from "@/lib/signup-mode";
import { Notice } from "../../notice";

export const metadata: Metadata = {
  title: "Crear cuenta — campIA",
};

interface RegisterPageProps {
  searchParams: Promise<{ __clerk_ticket?: string }>;
}

/** Crear la cuenta (Clerk). El link de una invitación trae `__clerk_ticket`: con él se crea aunque
 *  el registro esté cerrado. Después, `/dashboard/onboarding` completa los datos de campIA. */
export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const { __clerk_ticket: ticket } = await searchParams;
  const inviteOnly = signupMode() === "invite";

  return (
    <>
      {ticket ? (
        <Notice tone="success">Tenés acceso a Campia. Creá tu cuenta y arrancás 14 días gratis, sin tarjeta.</Notice>
      ) : inviteOnly ? (
        <Notice tone="info">
          Estamos en acceso anticipado. Si te invitaron, entrá con el link de la invitación. Si no,{" "}
          <Link href="/#demo" className="font-medium underline underline-offset-2">
            pedinos acceso
          </Link>
          .
        </Notice>
      ) : null}
      <SignUp path="/dashboard/register" routing="path" />
    </>
  );
}
