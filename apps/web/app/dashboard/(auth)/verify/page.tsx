import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerifyForm } from "./verify-form";

export const metadata: Metadata = {
  title: "Verificar código — AgroData",
};

interface VerifyPageProps {
  searchParams: Promise<{ wNumber?: string; mockCode?: string }>;
}

export default async function VerifyCodePage({ searchParams }: VerifyPageProps) {
  const { wNumber, mockCode } = await searchParams;
  if (!wNumber) redirect("/dashboard/sign-in");

  return (
    <Card className="w-full max-w-[420px] rounded-2xl border-border shadow-medium">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Ingresá el código</CardTitle>
        <CardDescription>
          Te enviamos un código de 6 dígitos por WhatsApp a {wNumber}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VerifyForm wNumber={wNumber} initialMockCode={mockCode} />
      </CardContent>
    </Card>
  );
}
