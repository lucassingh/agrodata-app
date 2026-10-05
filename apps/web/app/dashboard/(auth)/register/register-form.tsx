"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { registerSchema, type RegisterInput } from "@repo/core/auth/register.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { registerAction } from "./actions";

interface RegisterFormProps {
  /** Registro por invitación (acceso anticipado): el código de acceso importa. */
  inviteOnly: boolean;
  /** Datos del link de acceso de Campia, si llegó con uno. */
  defaults?: { name: string; lastname: string; email: string; accessCode: string };
}

export function RegisterForm({ inviteOnly, defaults }: RegisterFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: defaults?.name ?? "",
      lastname: defaults?.lastname ?? "",
      email: defaults?.email ?? "",
      wNumber: "+54",
      password: "",
      confirmPassword: "",
      invitationCode: defaults?.accessCode ?? "",
      acceptTerms: false,
    },
  });

  const onSubmit = (values: RegisterInput) => {
    setError(null);
    if (values.password !== values.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (!values.acceptTerms) {
      setError("Debe aceptar los términos y condiciones");
      return;
    }
    startTransition(async () => {
      const result = await registerAction(values);
      if (!result.success) {
        setError(result.error);
        return;
      }
      const params = new URLSearchParams({ wNumber: result.wNumber });
      if (result.mockCode) params.set("mockCode", result.mockCode);
      router.push(`/dashboard/verify?${params.toString()}`);
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre</Label>
          <Input id="name" {...register("name")} required />
          {errors.name ? (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          ) : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastname">Apellido</Label>
          <Input id="lastname" {...register("lastname")} required />
          {errors.lastname ? (
            <p className="text-xs text-destructive">{errors.lastname.message}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register("email")} required />
        {errors.email ? (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="wNumber">Número de WhatsApp</Label>
        <Input
          id="wNumber"
          placeholder="+54XXXXXXXXXX"
          {...register("wNumber")}
          required
        />
        <p className="text-xs text-muted-foreground">
          Formato: +54 seguido de 10 dígitos
        </p>
        {errors.wNumber ? (
          <p className="text-xs text-destructive">{errors.wNumber.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            {...register("password")}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">Mínimo 8 caracteres</p>
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Repetir contraseña</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirm ? "text" : "password"}
            {...register("confirmPassword")}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirm((p) => !p)}
            className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
            aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invitationCode">{inviteOnly ? "Código de acceso" : "Código de acceso (opcional)"}</Label>
        <Input
          id="invitationCode"
          placeholder="XXXX-XXXX-XXXX"
          autoCapitalize="characters"
          autoComplete="off"
          aria-describedby={inviteOnly ? "invitationCode-hint" : undefined}
          {...register("invitationCode")}
        />
        {inviteOnly ? (
          <p id="invitationCode-hint" className="text-xs text-muted-foreground">
            Viene con tu invitación de Campia. Si te invitó tu equipo, dejalo vacío.
          </p>
        ) : null}
      </div>

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

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full" disabled={isPending}>
        {isPending ? "Registrando..." : "Registrarme"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Ya tenés cuenta?{" "}
        <Link href="/dashboard/sign-in" className="font-medium text-primary">
          Iniciá sesión
        </Link>
      </p>
    </form>
  );
}
