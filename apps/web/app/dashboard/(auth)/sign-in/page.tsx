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

export default function SignInPage() {
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
      <CardContent>
        <SignInForm />
      </CardContent>
    </Card>
  );
}
