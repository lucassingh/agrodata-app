import Image from "next/image";
import { CampiaLogo } from "@/components/brand/campia-logo";
import { SUPPORT_EMAIL } from "@/components/landing/content";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen bg-background md:grid-cols-[60%_40%]">
      <div className="relative hidden overflow-hidden md:block">
        <Image
          src="/brand/bg-login.jpg"
          alt=""
          fill
          priority
          sizes="60vw"
          className="animate-field-zoom object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(140deg, rgba(27,67,50,0.6) 0%, rgba(45,106,79,0.32) 52%, rgba(82,183,136,0.18) 100%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-10 text-white">
          <h2 className="max-w-md font-heading text-2xl font-bold">
            Campia Intelligence
          </h2>
          <p className="max-w-md text-sm text-white/90">
            Gestioná campos y tambos con datos en tiempo real, IA y
            trazabilidad profesional.
          </p>
        </div>
      </div>

      {/* 16 px a los costados en celular: la tarjeta de Clerk mide el ancho de la pantalla menos 40 px. */}
      <div className="flex flex-col items-center justify-center gap-6 px-4 py-6 sm:p-10">
        <CampiaLogo className="text-primary text-[34px]" />
        {children}
        {/* Siempre visible: si algo del ingreso (de Clerk) no carga, nadie queda en una pantalla sin salida. */}
        <p className="max-w-[490px] text-center text-sm text-muted-foreground">
          ¿No podés entrar o la pantalla quedó en blanco? Recargá la página o escribinos a{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="rounded-sm font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </div>
    </div>
  );
}
