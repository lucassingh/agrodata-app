import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  title: "Ingresar — AgroData",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <Card className="w-full max-w-[490px] rounded-2xl border-border shadow-medium">
      <CardHeader>
        <CardTitle className="font-heading text-xl">
          Iniciar sesión
        </CardTitle>
        <CardDescription>
          Accedé a tu panel para administrar tus campos y tambos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error === "operator" ? (
          <p className="rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
            Tu rol en este campo es Operator: la carga se hace por WhatsApp. El acceso a la web es para Owner y
            Farm Manager.
          </p>
        ) : null}
        <SignInForm />
      </CardContent>
    </Card>
  );
}
