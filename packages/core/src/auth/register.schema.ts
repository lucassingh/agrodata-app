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

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Ingresá tu nombre").max(60),
  lastname: z.string().trim().min(1, "Ingresá tu apellido").max(60),
  email: z.string().trim().toLowerCase().email("Email inválido"),
  wNumber: wNumberSchema,
  password: z.string().min(8, "Mínimo 8 caracteres").max(64),
  confirmPassword: z.string().min(8).max(64),
  invitationCode: z.string().optional(),
  acceptTerms: z.boolean(),
  profileType: profileTypeSchema.optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
