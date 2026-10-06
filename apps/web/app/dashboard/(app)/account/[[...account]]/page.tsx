import type { Metadata } from "next";
import { UserProfile } from "@clerk/nextjs";
import { requireUser } from "@/lib/session";
import { HeroBanner } from "@/components/hero-banner";

export const metadata: Metadata = {
  title: "Mi cuenta — campIA",
};

/** Email, contraseña, Google y sesiones abiertas: lo maneja Clerk. La ruta es un catch-all porque
 *  Clerk usa sub-rutas para cada sección. El WhatsApp y la firma de los informes siguen en campIA. */
export default async function AccountPage() {
  await requireUser();
  return (
    <div className="space-y-6">
      <HeroBanner title="Mi cuenta" subtitle="Tu email, tu contraseña, el ingreso con Google y dónde tenés la sesión abierta." />
      <div className="flex justify-center">
        <UserProfile path="/dashboard/account" routing="path" />
      </div>
    </div>
  );
}
