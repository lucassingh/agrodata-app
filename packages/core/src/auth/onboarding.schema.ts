import { z } from "zod";

export const profileTypeSchema = z.enum([
  "AGRONOMO",
  "VETERINARIO",
  "PRODUCTOR",
  "ADMINISTRATIVO",
  "OTRO",
]);

export const wNumberSchema = z
  .string()
  .regex(/^\+54\d{10}$/, "Formato: +54 seguido de 10 dígitos");

/** Lo que completa quien entra por primera vez. El email y la contraseña los maneja Clerk. */
export const onboardingSchema = z.object({
  name: z.string().trim().min(1, "Ingresá tu nombre").max(60),
  lastname: z.string().trim().min(1, "Ingresá tu apellido").max(60),
  wNumber: wNumberSchema,
  profileType: profileTypeSchema.optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Tenés que aceptar los términos y la política de privacidad" }),
  }),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
