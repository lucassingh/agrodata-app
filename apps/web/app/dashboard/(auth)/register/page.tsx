import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, Info, TriangleAlert } from "lucide-react";
import { findValidAccessInvite, normalizeAccessCode } from "@repo/core";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signupMode } from "@/lib/signup-mode";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Crear cuenta — AgroData",
};

interface RegisterPageProps {
  searchParams: Promise<{ acceso?: string }>;
}

/** Con `?acceso=<código>` (el link que manda Soporte) llega con el código y los datos cargados. */
export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const mode = signupMode();
  const { acceso } = await searchParams;
  const code = normalizeAccessCode(acceso);
  const invite = code ? await findValidAccessInvite(code) : null;
  const [firstName = "", ...rest] = (invite?.name ?? "").trim().split(/\s+/);

  return (
    <Card className="w-full max-w-[490px] rounded-2xl border-border shadow-medium">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Crear cuenta</CardTitle>
        <CardDescription>
          Registrá tu perfil para gestionar campos y tambos en una sola plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invite ? (
          <Notice tone="success">Tenés acceso a AgroData. Creá tu cuenta y arrancás 14 días gratis, sin tarjeta.</Notice>
        ) : acceso && mode === "invite" ? (
          <Notice tone="warning">
            Ese link de acceso ya se usó o venció.{" "}
            <Link href="/#demo" className="font-medium underline underline-offset-2">
              Escribinos
            </Link>{" "}
            y te mandamos otro.
          </Notice>
        ) : mode === "invite" ? (
          <Notice tone="info">
            Estamos en acceso anticipado. Si alguien de tu equipo te invitó, registrate con el email o el WhatsApp de esa invitación. Si
            no,{" "}
            <Link href="/#demo" className="font-medium underline underline-offset-2">
              pedinos acceso
            </Link>
            .
          </Notice>
        ) : null}
        <RegisterForm
          inviteOnly={mode === "invite"}
          defaults={invite ? { name: firstName, lastname: rest.join(" "), email: invite.email, accessCode: invite.token } : undefined}
        />
      </CardContent>
    </Card>
  );
}

const TONES = {
  success: { icon: CircleCheck, className: "border-primary/25 bg-primary/5 text-foreground" },
  warning: { icon: TriangleAlert, className: "border-[#D97706]/30 bg-[#FDF4E3] text-[#8A5A12]" },
  info: { icon: Info, className: "border-border bg-muted/60 text-foreground" },
} as const;

function Notice({ tone, children }: { tone: keyof typeof TONES; children: React.ReactNode }) {
  const { icon: Icon, className } = TONES[tone];
  return (
    <div role={tone === "warning" ? "alert" : "status"} className={`flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm leading-relaxed ${className}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p>{children}</p>
    </div>
  );
}
