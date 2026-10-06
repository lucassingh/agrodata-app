import type { Metadata } from "next";
import { SignOutButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Sin acceso a la web — campIA",
};

/** A dónde manda `requireUser` a quien tiene cuenta pero solo es operario en sus campos. */
export default function NoAccessPage() {
  return (
    <Card className="w-full max-w-[490px] rounded-2xl border-border shadow-medium">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Tu carga va por WhatsApp</CardTitle>
        <CardDescription>
          En tus campos sos operario: lo que hacés se carga mandándole un mensaje al asistente de Campia por WhatsApp. La web
          es para dueños, encargados y asesores. Si necesitás entrar, pedile a quien administra el campo que te cambie el rol.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignOutButton redirectUrl="/dashboard/sign-in">
          <Button variant="outline" className="w-full">
            Cerrar sesión
          </Button>
        </SignOutButton>
      </CardContent>
    </Card>
  );
}
