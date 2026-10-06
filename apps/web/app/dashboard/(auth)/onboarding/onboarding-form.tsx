"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { SignOutButton } from "@clerk/nextjs";
import { onboardingSchema } from "@repo/core/auth/onboarding.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { completeOnboardingAction } from "./actions";

interface FormValues {
  name: string;
  lastname: string;
  wNumber: string;
  acceptTerms: boolean;
}

interface OnboardingFormProps {
  email: string;
  defaults: { name: string; lastname: string };
}

export function OnboardingForm({ email, defaults }: OnboardingFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  const { register, handleSubmit, control } = useForm<FormValues>({
    defaultValues: { name: defaults.name, lastname: defaults.lastname, wNumber: "+54", acceptTerms: false },
  });

  const onSubmit = (values: FormValues) => {
    setError(null);
    const parsed = onboardingSchema.safeParse(values);
    if (!parsed.success) {
      const errors: Partial<Record<keyof FormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof FormValues;
        errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    startTransition(async () => {
      const result = await completeOnboardingAction(parsed.data);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <p className="text-sm text-muted-foreground">
        Tu cuenta: <span className="font-medium text-foreground">{email}</span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" autoComplete="given-name" aria-invalid={Boolean(fieldErrors.name)} {...register("name")} />
          {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastname">Apellido</Label>
          <Input id="lastname" autoComplete="family-name" aria-invalid={Boolean(fieldErrors.lastname)} {...register("lastname")} />
          {fieldErrors.lastname ? <p className="text-xs text-destructive">{fieldErrors.lastname}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="wNumber">Número de WhatsApp</Label>
        <Input
          id="wNumber"
          type="tel"
          autoComplete="tel"
          placeholder="+54XXXXXXXXXX"
          aria-describedby="wNumber-hint"
          aria-invalid={Boolean(fieldErrors.wNumber)}
          {...register("wNumber")}
        />
        <p id="wNumber-hint" className="text-xs text-muted-foreground">
          +54 seguido de 10 dígitos, sin el 15 (ej. +542611234567)
        </p>
        {fieldErrors.wNumber ? <p className="text-xs text-destructive">{fieldErrors.wNumber}</p> : null}
      </div>

      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Controller
            name="acceptTerms"
            control={control}
            render={({ field }) => (
              <Checkbox
                id="acceptTerms"
                checked={field.value}
                onCheckedChange={(checked: boolean) => field.onChange(checked === true)}
              />
            )}
          />
          <Label htmlFor="acceptTerms" className="font-normal">
            <span>
              Acepto los{" "}
              <Link href="/terminos" target="_blank" className="text-primary underline underline-offset-2">
                términos y condiciones
              </Link>{" "}
              y la{" "}
              <Link href="/privacidad" target="_blank" className="text-primary underline underline-offset-2">
                política de privacidad
              </Link>
            </span>
          </Label>
        </div>
        {fieldErrors.acceptTerms ? <p className="text-xs text-destructive">{fieldErrors.acceptTerms}</p> : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Guardando..." : "Empezar"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        ¿No es tu cuenta?{" "}
        <SignOutButton redirectUrl="/dashboard/sign-in">
          <button type="button" className="font-medium text-primary underline-offset-2 hover:underline">
            Cerrar sesión
          </button>
        </SignOutButton>
      </p>
    </form>
  );
}
