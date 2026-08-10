"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { authenticate, requestWhatsappLoginCode } from "./actions";

// Solo en desarrollo: precarga el usuario demo del seed para no tener que
// tipearlo en cada reinicio del server. Nunca se incluye en producción.
const isDev = process.env.NODE_ENV !== "production";
const DEV_EMAIL = isDev ? "owner@agrodata.dev" : "";
const DEV_PASSWORD = isDev ? "AgroData123!" : "";

function EmailTab() {
  const [errorMessage, formAction, isPending] = useActionState(
    authenticate,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="vos@tucampo.com"
          defaultValue={DEV_EMAIL}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue={DEV_PASSWORD}
          required
        />
      </div>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}

function WhatsappTab() {
  const router = useRouter();
  const [wNumber, setWNumber] = useState("+54");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await requestWhatsappLoginCode(wNumber);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const params = new URLSearchParams({ wNumber });
      if (result.mockCode) params.set("mockCode", result.mockCode);
      router.push(`/dashboard/verify?${params.toString()}`);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="wNumber">Número de WhatsApp</Label>
        <Input
          id="wNumber"
          value={wNumber}
          onChange={(e) => setWNumber(e.target.value)}
          placeholder="+54XXXXXXXXXX"
          required
        />
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Enviando..." : "Enviar código"}
      </Button>
    </form>
  );
}

export function SignInForm() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="email">
        <TabsList className="mb-2 w-full">
          <TabsTrigger value="email" className="flex-1">
            Email
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex-1">
            WhatsApp
          </TabsTrigger>
        </TabsList>
        <TabsContent value="email">
          <EmailTab />
        </TabsContent>
        <TabsContent value="whatsapp">
          <WhatsappTab />
        </TabsContent>
      </Tabs>
      <p className="text-center text-sm text-muted-foreground">
        No tenés cuenta?{" "}
        <Link href="/dashboard/register" className="font-medium text-primary">
          Registrate
        </Link>
      </p>
    </div>
  );
}
