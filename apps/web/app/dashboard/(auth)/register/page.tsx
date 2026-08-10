import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = {
  title: "Crear cuenta — AgroData",
};

export default function RegisterPage() {
  return (
    <Card className="w-full max-w-[490px] rounded-2xl border-border shadow-medium">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Crear cuenta</CardTitle>
        <CardDescription>
          Registrá tu perfil para gestionar campos y tambos en una sola plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}
