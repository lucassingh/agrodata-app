import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getWebUser } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = {
  title: "Completá tus datos — campIA",
};

/** Primer ingreso: la cuenta ya existe en Clerk; acá se completan los datos de campIA (sobre todo
 *  el WhatsApp, con el que el bot la reconoce) y arranca la prueba gratis. */
export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/dashboard/sign-in");
  if (await getWebUser()) redirect("/dashboard");
  const account = await currentUser();
  if (!account) redirect("/dashboard/sign-in");

  return (
    <Card className="w-full max-w-[490px] rounded-2xl border-border shadow-medium">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Completá tus datos</CardTitle>
        <CardDescription>
          Un paso más: con tu WhatsApp, el asistente de Campia reconoce lo que le mandás.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OnboardingForm
          email={account.primaryEmailAddress?.emailAddress ?? ""}
          defaults={{ name: account.firstName ?? "", lastname: account.lastName ?? "" }}
        />
      </CardContent>
    </Card>
  );
}
